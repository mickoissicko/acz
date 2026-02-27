/* constant for the server-hosted config path */
const CONFIG_URL = "/config.acz.mix";

async function LoadConfiguration() {
    let Response = await fetch(CONFIG_URL);
    let Text = await Response.text();
    return ParseAczFormat(Text);
}

function ParseAczFormat(RawText) {
    let ParsedData = {};
    let CurrentSection = "GLOBAL";
    let Lines = RawText.split("\n");
    
    Lines.forEach(Line => {
        let CleanLine = Line.trim();
        if (!CleanLine || CleanLine.startsWith("#")) return;
        
        if (CleanLine.startsWith("[") && CleanLine.endsWith("]")) {
            CurrentSection = CleanLine.substring(1, CleanLine.length - 1);
            ParsedData[CurrentSection] = {};
        } else if (CleanLine.includes(":")) {
            let [Key, ...ValueParts] = CleanLine.split(":");
            let Value = ValueParts.join(":").trim().replace(/^["']|["']$/g, "");
            ParsedData[CurrentSection][Key.trim()] = Value;
        }
    });
    return ParsedData;
}