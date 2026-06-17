[void][System.Reflection.Assembly]::LoadWithPartialName("System.Security")
$vault = [Windows.Security.Credentials.PasswordVault, Windows.Security.Credentials, ContentType=WindowsRuntime]::new()
try {
    $creds = $vault.RetrieveAll()
    $found = $false
    foreach ($c in $creds) {
        if ($c.Resource -like "*mysql*" -or $c.Resource -like "*aiven*") {
            $c.RetrievePassword()
            Write-Output "Resource: $($c.Resource)"
            Write-Output "UserName: $($c.UserName)"
            Write-Output "Password: $($c.Password)"
            $found = $true
        }
    }
    if (-not $found) {
        Write-Output "No credentials matching mysql or aiven found in vault."
    }
} catch {
    Write-Error $_.Exception.Message
}
