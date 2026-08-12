$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$files = Get-ChildItem -Path "d:\Licence\Licence 3\JBA\code\oas-front\src\app" -Recurse -Include *.ts, *.html, *.scss
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
    # Simple regex replace (case-sensitive to preserve capitalization)
    $newContent = $content -creplace 'Fiche atelier', 'Ordre de réparation' `
                           -creplace 'fiche atelier', 'ordre de réparation' `
                           -creplace 'Fiches atelier', 'Ordres de réparation' `
                           -creplace 'fiches atelier', 'ordres de réparation' `
                           -creplace 'Fiche Atelier', 'Ordre de Réparation' `
                           -creplace 'Fiches Atelier', 'Ordres de Réparation' `
                           -creplace 'Fiche de reparation', 'Ordre de réparation' `
                           -creplace 'fiche de reparation', 'ordre de réparation' `
                           -creplace 'Fiche de réparation', 'Ordre de réparation' `
                           -creplace 'fiche de réparation', 'ordre de réparation'
                           
    if ($content -cne $newContent) {
        [System.IO.File]::WriteAllText($file.FullName, $newContent, $utf8NoBom)
        Write-Host "Updated $($file.FullName)"
    }
}
