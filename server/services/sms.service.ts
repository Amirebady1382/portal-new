import axios from 'axios';
import { logger } from "../utils/logger";

interface SMSConfig {
  apiKey: string;
  templateId: number;
  baseUrl: string;
}

interface OTPResponse {
  status: number;
  message: string;
  data?: {
    messageId: number;
    cost: number;
  };
}

export class SMSService {
  private config: SMSConfig;

  constructor() {
    this.config = {
      apiKey: '', // Will be set lazily
      templateId: parseInt(process.env.SMS_IR_TEMPLATE_ID || '282681'),
      baseUrl: 'https://api.sms.ir/v1'
    };
  }

  private getApiKey(): string {
    if (!this.config.apiKey) {
      const apiKey = process.env.SMS_IR_API_KEY;
      if (!apiKey) {
        throw new Error('SMS_IR_API_KEY environment variable is required');
      }
      this.config.apiKey = apiKey;
    }
    return this.config.apiKey;
  }
  
  async sendOTP(phone: string, code: string): Promise<OTPResponse> {
    try {
      logger.info(`📱 ارسال کد OTP به شماره ${phone}`, "sms");
      
      const requestData = {
        mobile: phone,
        templateId: this.config.templateId,
        parameters: [{ name: 'CODE', value: code }] // Using 'CODE' as parameter name
      };
      
      // Create safe copy for logging
      const safeRequestData = {
        ...requestData,
        parameters: requestData.parameters.map(p =>
          p.name === 'CODE' ? { ...p, value: '******' } : p
        )
      };

      logger.info(`📤 Full request to SMS.ir`, "sms", { request: safeRequestData });

      const response = await axios.post(
        `${this.config.baseUrl}/send/verify`,
        requestData,
        {
          headers: {
            'X-API-KEY': this.getApiKey(),
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info(`✅ پیامک با موفقیت ارسال شد`, "sms", { response: response.data });
      return response.data;
    } catch (error: any) {
      logger.error(`❌ خطا در ارسال پیامک`, "sms", error instanceof Error ? error : new Error(String(error)));
      
      if (error.response) {
        logger.error(`❌ خطای سرور SMS: ${error.response.status}`, "sms", undefined, undefined, { response: error.response.data });
        throw new Error(`خطا در ارسال پیامک: ${error.response.data?.message || 'خطای سرور'}`);
      } else if (error.request) {
        logger.error(`❌ عدم پاسخ از سرور SMS`, "sms");
        throw new Error('عدم پاسخ از سرور پیامک');
      } else {
        throw new Error('خطا در ارسال پیامک');
      }
    }
  }

  generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  validatePhoneNumber(phone: string): boolean {
    // Iranian mobile number format: 09xxxxxxxxx
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(phone);
  }
}

export const smsService = new SMSService();
