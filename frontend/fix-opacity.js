const fs = require('fs');

const hexToRgb = (hex) => {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

let css = fs.readFileSync('src/app/globals.css', 'utf8');

// Replace hex values in root and dark with RGB values
css = css.replace(/(:root\s*\{[^}]+})/m, (match) => {
    return match.replace(/#([A-Fa-f0-9]{6})/g, (m, hex) => {
        return hexToRgb('#' + hex);
    });
});

css = css.replace(/(\.dark\s*\{[^}]+})/m, (match) => {
    return match.replace(/#([A-Fa-f0-9]{6})/g, (m, hex) => {
        return hexToRgb('#' + hex);
    });
});

fs.writeFileSync('src/app/globals.css', css);

let tailwind = fs.readFileSync('tailwind.config.ts', 'utf8');

// Replace "var(--color-bone)" with "rgb(var(--color-bone) / <alpha-value>)"
tailwind = tailwind.replace(/"var\((--color-[a-z0-9-]+)\)"/g, '"rgb(var($1) / <alpha-value>)"');

fs.writeFileSync('tailwind.config.ts', tailwind);
console.log("Done");
