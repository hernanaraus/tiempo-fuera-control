/**
 * Procesa un archivo de imagen (ideal 1000x1000 PNG transparente):
 * 1) Lo optimiza a maxSize x maxSize px manteniendo transparencia y nitidez.
 * 2) Extrae los 3 colores dominantes (Primario, Secundario, Acento).
 * 3) Detecta si el logo es mayormente blanco/claro para sugerir modo marca de agua.
 */
export function processLogoImage(file, maxSize = 320) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("No se seleccionó archivo."));

        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Error al leer el archivo de imagen."));
        reader.onload = (ev) => {
            const img = new Image();
            img.onerror = () => reject(new Error("Formato de imagen no válido."));
            img.onload = () => {
                // Redimensionar manteniendo proporción dentro de maxSize x maxSize
                let w = img.width;
                let h = img.height;
                if (w > maxSize || h > maxSize) {
                    if (w >= h) {
                        h = Math.round((h * maxSize) / w);
                        w = maxSize;
                    } else {
                        w = Math.round((w * maxSize) / h);
                        h = maxSize;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);

                const optimizedDataUrl = canvas.toDataURL("image/png");
                const analysis = extractDominantPalette(ctx, w, h);

                resolve({
                    dataUrl: optimizedDataUrl,
                    width: img.width,
                    height: img.height,
                    palette: analysis.palette,
                    isMostlyWhite: analysis.isMostlyWhite
                });
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function rgbToHex(r, g, b) {
    return (
        "#" +
        [r, g, b]
            .map((x) => {
                const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            })
            .join("")
    );
}

function extractDominantPalette(ctx, w, h) {
    const data = ctx.getImageData(0, 0, w, h).data;
    const buckets = new Map();
    let visiblePixels = 0;
    let brightWhitePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Ignorar píxeles transparentes
        if (a < 110) continue;
        visiblePixels++;

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 225) brightWhitePixels++;

        // Ignorar negros casi puros o blancos casi puros para la paleta cromática
        if (lum < 22 || lum > 242) continue;

        // Cuantización en bloques de 24 para agrupar tonos cercanos
        const qr = Math.round(r / 24) * 24;
        const qg = Math.round(g / 24) * 24;
        const qb = Math.round(b / 24) * 24;
        const key = `${qr},${qg},${qb}`;

        // Ponderar ligeramente colores con mayor saturación
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
        const weight = 1 + sat * 1.8;

        const prev = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0, weight: 0 };
        prev.r += r;
        prev.g += g;
        prev.b += b;
        prev.count += 1;
        prev.weight += weight;
        buckets.set(key, prev);
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => b.weight - a.weight);

    const distinct = [];
    for (const item of sorted) {
        const avgR = item.r / item.count;
        const avgG = item.g / item.count;
        const avgB = item.b / item.count;

        const isTooClose = distinct.some((d) => {
            const dist = Math.hypot(d.r - avgR, d.g - avgG, d.b - avgB);
            return dist < 55;
        });

        if (!isTooClose) {
            distinct.push({ r: avgR, g: avgG, b: avgB });
        }
        if (distinct.length >= 3) break;
    }

    // Colores de respaldo estilo Tiempo Fuera si el logo era monocromo
    const primary = distinct[0] ? rgbToHex(distinct[0].r, distinct[0].g, distinct[0].b) : "#12151c";
    const secondary = distinct[1] ? rgbToHex(distinct[1].r, distinct[1].g, distinct[1].b) : "#d9232e";
    const accent = distinct[2]
        ? rgbToHex(distinct[2].r, distinct[2].g, distinct[2].b)
        : distinct[1]
        ? rgbToHex(distinct[1].r, distinct[1].g, distinct[1].b)
        : "#f5b841";

    const isMostlyWhite = visiblePixels > 0 && brightWhitePixels / visiblePixels > 0.72;

    return {
        palette: { primary, secondary, accent },
        isMostlyWhite
    };
}
