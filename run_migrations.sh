#!/bin/bash
expect -c '
spawn npm run db:push:pg
expect "No, abort"
send "\033\[B\r"
expect eof
'
