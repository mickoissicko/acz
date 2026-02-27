// config.js
const FS = require('fs');
const PATH = require('path');

class Config {
    constructor(path) {
        this.path = path;
        this.data = this.parse();
    }

    parse() {
        if (!FS.existsSync(this.path)) return {};
        const content = FS.readFileSync(this.path, 'utf-8');
        const sections = {};
        let currentSection = null;

        content.split(/\r?\n/).forEach(line => {
            line = line.trim();
            if (line.startsWith('[') && line.endsWith(']')) {
                currentSection = line.slice(1, -1);
                sections[currentSection] = {};
            } else if (currentSection && line.includes(':')) {
                const [key, ...val] = line.split(':');
                sections[currentSection][key.trim()] = val.join(':').trim().replace(/^["']|["']$/g, "");
            }
        });
        return sections;
    }

    getPath(key) { return this.data[key]?.Path || null; }
}

module.exports = Config;