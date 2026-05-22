param(
  [int]$Port = 8000,
  [string]$Root = (Resolve-Path "$PSScriptRoot\..").Path
)

$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/"

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = [IO.StreamReader]::new($stream)
    $line = $reader.ReadLine()
    if ($null -eq $line) {
      continue
    }

    $parts = $line.Split(" ")
    $path = if ($parts.Length -gt 1) {
      [Uri]::UnescapeDataString($parts[1].Split("?")[0].TrimStart("/"))
    } else {
      "index.html"
    }
    if ([string]::IsNullOrWhiteSpace($path)) {
      $path = "index.html"
    }

    do {
      $header = $reader.ReadLine()
    } while ($null -ne $header -and $header -ne "")

    $full = [IO.Path]::GetFullPath([IO.Path]::Combine($Root, $path))
    if (($full.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) -and (Test-Path -LiteralPath $full -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
      $type = switch ($ext) {
        ".html" { "text/html" }
        ".css" { "text/css" }
        ".js" { "text/javascript" }
        default { "application/octet-stream" }
      }
      $head = "HTTP/1.1 200 OK`r`nContent-Type: $type`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
      $hbytes = [Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hbytes, 0, $hbytes.Length)
      $stream.Write($bytes, 0, $bytes.Length)
    } else {
      $body = [Text.Encoding]::UTF8.GetBytes("Not found")
      $head = "HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $hbytes = [Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hbytes, 0, $hbytes.Length)
      $stream.Write($body, 0, $body.Length)
    }
  } finally {
    $client.Close()
  }
}
