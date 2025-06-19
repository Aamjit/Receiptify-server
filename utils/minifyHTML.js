function minifyHTML(html) {
    // Remove HTML comments
    let minified = html.replace(/<!--[\s\S]*?-->/g, '');
    // Remove whitespace between tags
    minified = minified.replace(/>\s+</g, '><');
    // Collapse multiple spaces
    minified = minified.replace(/\s{2,}/g, ' ');
    // Remove leading/trailing whitespace
    minified = minified.trim();
    return minified;
}

module.exports = minifyHTML