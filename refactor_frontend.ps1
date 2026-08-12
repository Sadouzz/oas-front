$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$files = Get-ChildItem -Path "d:\Licence\Licence 3\JBA\code\oas-front\src\app" -Recurse -Include *.ts, *.html, *.scss
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $newContent = $content -creplace 'FicheAtelier', 'OrdreReparation' `
                           -creplace 'ficheAtelier', 'ordreReparation' `
                           -creplace 'FichesAtelier', 'OrdresReparation' `
                           -creplace 'fichesAtelier', 'ordresReparation' `
                           -creplace 'fiches_atelier', 'ordres_reparation' `
                           -creplace 'fiche_atelier', 'ordre_reparation' `
                           -creplace 'fiches-atelier', 'ordres-reparation' `
                           -creplace 'fiche-atelier', 'ordre-reparation' `
                           -creplace 'Fiche Atelier', 'Ordre de Réparation' `
                           -creplace 'Fiches Atelier', 'Ordres de Réparation'
    
    if ($content -cne $newContent) {
        [System.IO.File]::WriteAllText($file.FullName, $newContent, $utf8NoBom)
        Write-Host "Updated $($file.FullName)"
    }
}
