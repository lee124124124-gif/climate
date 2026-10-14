# 휴대폰 등 같은 네트워크의 다른 기기에서 접속할 수 있는 정적 파일 서버.
#
# serve.ps1 은 localhost 전용이라 PC에서만 열리고, 카메라(getUserMedia)는
# http://localhost 또는 https:// 에서만 동작한다. 그래서 휴대폰으로 보려면
#   - 모든 네트워크 카드에 바인딩하고 (TcpListener, 관리자 권한 불필요)
#   - HTTPS로 서비스해야 한다 (자체 서명 인증서)
#
#   사용법: powershell -ExecutionPolicy Bypass -File .\serve-mobile.ps1 [포트]
#           powershell -ExecutionPolicy Bypass -File .\serve-mobile.ps1 8443 -NoTls   # 평문 http로
#
# 자체 서명 인증서라서 휴대폰 브라우저가 "연결이 비공개가 아닙니다" 경고를 띄운다.
# [고급] → [계속 진행] 을 누르면 되고, 그 뒤에는 카메라도 정상 동작한다.

param(
    [int]$Port = 8443,
    [switch]$NoTls
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".txt"  = "text/plain; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

# ── 이 PC의 LAN IP 찾기 ────────────────────────────────────────────
$ips = @(Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.InterfaceAlias -notmatch "Loopback" } |
    Select-Object -ExpandProperty IPAddress)

# ── 인증서 준비 (https 모드일 때만) ────────────────────────────────
$cert = $null
if (-not $NoTls) {
    $subject = "CN=photobooth-lan"
    $cert = Get-ChildItem Cert:\CurrentUser\My |
        Where-Object { $_.Subject -eq $subject -and $_.NotAfter -gt (Get-Date) -and $_.HasPrivateKey } |
        Select-Object -First 1

    if (-not $cert) {
        Write-Host "자체 서명 인증서를 만드는 중..."
        # 주소창에 IP를 치고 들어오므로 SAN에 IP도 넣어준다.
        $san = "2.5.29.17={text}DNS=localhost&DNS=photobooth-lan"
        foreach ($ip in $ips) { $san += "&IPAddress=$ip" }
        $cert = New-SelfSignedCertificate `
            -Subject $subject `
            -CertStoreLocation "Cert:\CurrentUser\My" `
            -KeyLength 2048 `
            -KeyExportPolicy Exportable `
            -NotAfter (Get-Date).AddYears(2) `
            -TextExtension @($san, "2.5.29.37={text}1.3.6.1.5.5.7.3.1")
    }
}

# ── 요청 처리 (각 접속마다 별도 스레드에서 실행) ───────────────────
$handler = {
    param($client, $root, $cert, $useTls, $mime)

    try {
        $client.ReceiveTimeout = 8000
        $client.SendTimeout = 20000
        $stream = $client.GetStream()

        if ($useTls) {
            $ssl = New-Object System.Net.Security.SslStream($stream, $false)
            $ssl.AuthenticateAsServer($cert, $false, [System.Security.Authentication.SslProtocols]::Tls12, $false)
            $stream = $ssl
        }
        $stream.ReadTimeout = 8000
        $stream.WriteTimeout = 20000

        # 요청 줄 + 헤더를 빈 줄이 나올 때까지 읽는다.
        $sb = New-Object System.Text.StringBuilder
        $requestLine = $null
        $blank = 0
        while ($true) {
            $b = $stream.ReadByte()
            if ($b -lt 0) { break }
            if ($b -eq 10) {
                $line = $sb.ToString()
                [void]$sb.Clear()
                if ($null -eq $requestLine) { $requestLine = $line }
                if ($line.Length -eq 0) { $blank++ }
                if ($blank -ge 1) { break }
            } elseif ($b -ne 13) {
                [void]$sb.Append([char]$b)
            }
        }
        if ([string]::IsNullOrWhiteSpace($requestLine)) { return }

        $parts = $requestLine -split " "
        $method = $parts[0]
        $target = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
        $path = ($target -split "\?")[0]
        $path = [System.Uri]::UnescapeDataString($path)
        if ($path -eq "/") { $path = "/index.html" }

        $status = "404 Not Found"
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
        $type = "text/plain; charset=utf-8"

        if ($method -eq "GET" -or $method -eq "HEAD") {
            $candidate = Join-Path $root ($path -replace "^/", "" -replace "/", "\")
            $full = $null
            try { $full = [System.IO.Path]::GetFullPath($candidate) } catch { $full = $null }
            # 서버 폴더 밖의 파일이 새어나가지 않게 막는다.
            $rootFull = [System.IO.Path]::GetFullPath($root)
            if ($full -and $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path $full -PathType Leaf)) {
                $ext = [System.IO.Path]::GetExtension($full).ToLower()
                $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
                $body = [System.IO.File]::ReadAllBytes($full)
                $status = "200 OK"
            }
        } else {
            $status = "405 Method Not Allowed"
            $body = [System.Text.Encoding]::UTF8.GetBytes("405")
        }

        $header = "HTTP/1.1 $status`r`n" +
                  "Content-Type: $type`r`n" +
                  "Content-Length: $($body.Length)`r`n" +
                  "Cache-Control: no-store, no-cache, must-revalidate`r`n" +
                  "Connection: close`r`n`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        if ($method -ne "HEAD") { $stream.Write($body, 0, $body.Length) }
        $stream.Flush()
    } catch {
        # 브라우저가 미리 열어두고 안 쓰는 연결, 인증서 경고에서 끊은 연결 등은
        # 여기로 들어온다. 서버 전체를 죽이지 않고 조용히 넘어간다.
    } finally {
        try { $client.Close() } catch { }
    }
}

# ── 서버 시작 ──────────────────────────────────────────────────────
$scheme = if ($NoTls) { "http" } else { "https" }
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
$listener.Start()

$pool = [runspacefactory]::CreateRunspacePool(1, 8)
$pool.Open()
$running = New-Object System.Collections.ArrayList

Write-Host ""
Write-Host "  폴더 : $root"
Write-Host "  PC   : $scheme`://localhost:$Port"
foreach ($ip in $ips) {
    Write-Host "  휴대폰: $scheme`://$ip`:$Port    <-- 이 주소를 휴대폰 브라우저에 입력하세요"
}
if (-not $NoTls) {
    Write-Host ""
    Write-Host "  * 자체 서명 인증서라 경고가 뜹니다. [고급] -> [계속 진행]을 누르면 됩니다."
}
Write-Host "  (끄려면 Ctrl+C)"
Write-Host ""

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()

        $ps = [powershell]::Create()
        $ps.RunspacePool = $pool
        [void]$ps.AddScript($handler).AddArgument($client).AddArgument($root).AddArgument($cert).AddArgument(-not $NoTls).AddArgument($mime)
        $async = $ps.BeginInvoke()
        [void]$running.Add([pscustomobject]@{ PS = $ps; Async = $async })

        # 끝난 작업 정리
        for ($i = $running.Count - 1; $i -ge 0; $i--) {
            if ($running[$i].Async.IsCompleted) {
                try { $running[$i].PS.EndInvoke($running[$i].Async) } catch { }
                $running[$i].PS.Dispose()
                $running.RemoveAt($i)
            }
        }
    }
} finally {
    $listener.Stop()
    $pool.Close()
    Write-Host "서버를 종료했습니다."
}
