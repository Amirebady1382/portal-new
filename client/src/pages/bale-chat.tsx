import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import BaleChatInterface from "@/components/chat/bale-chat-interface";

export default function BaleChatPage() {
  const { user } = useAuth();

  // برای مشتریان، چت را به صورت تمام صفحه نمایش می‌دهیم
  if (user?.role === "customer") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16">
          <BaleChatInterface />
        </div>
      </div>
    );
  }

  // برای کارمندان و ادمین، با سایدبار نمایش می‌دهیم
  return (
    <div className="h-screen bg-gray-50 flex flex-col" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex flex-1 pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72">
          <BaleChatInterface />
        </main>
      </div>
    </div>
  );
} 
