const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.html') || file.endsWith('.scss')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src', 'app'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const newContent = content
        .replace(/Fiche atelier/g, 'Ordre de réparation')
        .replace(/fiche atelier/g, 'ordre de réparation')
        .replace(/Fiches atelier/g, 'Ordres de réparation')
        .replace(/fiches atelier/g, 'ordres de réparation')
        .replace(/Fiche Atelier/g, 'Ordre de Réparation')
        .replace(/Fiches Atelier/g, 'Ordres de Réparation')
        .replace(/FicheAtelier/g, 'OrdreReparation')
        .replace(/ficheAtelier/g, 'ordreReparation')
        .replace(/FichesAtelier/g, 'OrdresReparation')
        .replace(/fichesAtelier/g, 'ordresReparation')
        .replace(/fiches_atelier/g, 'ordres_reparation')
        .replace(/fiche_atelier/g, 'ordre_reparation')
        .replace(/fiches-atelier/g, 'ordres-reparation')
        .replace(/fiche-atelier/g, 'ordre-reparation');
        
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log('Updated ' + file);
    }
});
