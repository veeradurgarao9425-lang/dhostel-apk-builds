Add-Type -AssemblyName System.Drawing

$files = @(
    "assets/growth/cooking_disaster.png",
    "assets/growth/missed_bus.png",
    "assets/growth/general_cover.png",
    "assets/tenant_3d.png"
)

foreach ($file in $files) {
    $fullPath = Join-Path (Get-Location) $file
    if (Test-Path $fullPath) {
        Write-Host "Converting: $fullPath"
        $img = [System.Drawing.Image]::FromFile($fullPath)
        $tempPath = $fullPath + ".tmp"
        $img.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
        
        Remove-Item $fullPath -Force
        Rename-Item $tempPath -NewName (Split-Path $fullPath -Leaf)
        Write-Host "Successfully converted $file to true PNG"
    } else {
        Write-Warning "File not found: $fullPath"
    }
}
