#!/usr/bin/env python3
"""presigned POST 업로드(S3 호환). usage: upload_presigned.py <fields.json> <file> <upload_url>
호스팅 MCP의 deploy/update 응답에 있는 upload.url과 upload.fields를 그대로 넘긴다."""
import json, subprocess, sys
fields = json.load(open(sys.argv[1]))
if len(sys.argv) < 4:
    sys.exit("usage: upload_presigned.py <fields.json> <file> <upload_url>")
url = sys.argv[3]
args = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url]
for k, v in fields.items():
    args += ["-F", f"{k}={v}"]
args += ["-F", f"file=@{sys.argv[2]}"]
print(subprocess.run(args, capture_output=True, text=True).stdout)
