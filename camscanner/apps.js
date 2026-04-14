function onOpenCvReady() {
    console.log("✅ OpenCV loaded");
}

let globalImg = '';

document.getElementById('upload').addEventListener('change', function (e) {
    let file = e.target.files[0];
    let img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = function () {
        img.width = 600;
        img.height = 400;
        globalImg = img;
        let src = cv.imread(img);
        cv.imshow('canvasOutput', src);

        console.log("Gambar tampil");

        document.getElementById("buttons").innerHTML =
            `<button onclick="scanDocument()">Scan Now</button>`;
    };
});

function scanDocument() {
    if (!globalImg) {
        console.log("No image loaded");
        return;
    }

    // ✅ FIX: langsung pakai image element
    let src = cv.imread(globalImg);

    let gray = new cv.Mat();
    let edged = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    cv.Canny(gray, edged, 75, 200);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let biggest = null;
    let maxArea = 0;

    let approxList = [];

    for (let i = 0; i < contours.size(); i++) {
        let cnt = contours.get(i);
        let peri = cv.arcLength(cnt, true);

        let approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

        let area = cv.contourArea(cnt);

        if (approx.rows >= 4 && area > maxArea) {
            if (biggest) biggest.delete(); // cleanup previous
            biggest = approx;
            maxArea = area;
        } else {
            approx.delete();
        }

        cnt.delete();
    }

    if (!biggest) {
        console.log("❌ Kontur tidak ditemukan");
        cv.imshow('canvasOutput', src);

        src.delete(); gray.delete(); edged.delete();
        contours.delete(); hierarchy.delete();

        return;
    }

    let pts = [];
    for (let i = 0; i < 4; i++) {
        let p = biggest.intPtr(i);
        pts.push({ x: p[0], y: p[1] });
    }

    let ordered = orderPoints(pts);

    let width = Math.floor(Math.max(
        distance(ordered[0], ordered[1]),
        distance(ordered[2], ordered[3])
    ));

    let height = Math.floor(Math.max(
        distance(ordered[0], ordered[3]),
        distance(ordered[1], ordered[2])
    ));

    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        ordered[0].x, ordered[0].y,
        ordered[1].x, ordered[1].y,
        ordered[2].x, ordered[2].y,
        ordered[3].x, ordered[3].y
    ]);


    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        width, 0,
        width, height,
        0, height
    ]);

    console.log("width:", width, "height:", height);

    let M = cv.getPerspectiveTransform(srcTri, dstTri);

    let dst = new cv.Mat();
    cv.warpPerspective(src, dst, M, new cv.Size(width, height));

    let gray2 = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // lebih kuat contrast
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

    // adaptive threshold dulu (INI KUNCI)
    cv.adaptiveThreshold(
        gray,
        gray,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY,
        11,
        2
    );

    // baru edge detection lebih kuat
    cv.Canny(gray, edged, 50, 150);

    cv.imshow('canvasOutput2', edged);

    // cleanup
    src.delete();
    gray.delete();
    edged.delete();
    contours.delete();
    hierarchy.delete();
    dst.delete();
    gray2.delete();
    srcTri.delete();
    dstTri.delete();
    M.delete();
    biggest.delete();

    function orderPoints(pts) {
        let sum = pts.map(p => p.x + p.y);
        let diff = pts.map(p => p.y - p.x);

        return [
            pts[sum.indexOf(Math.min(...sum))],
            pts[diff.indexOf(Math.min(...diff))],
            pts[sum.indexOf(Math.max(...sum))],
            pts[diff.indexOf(Math.max(...diff))]
        ];
    }

    function distance(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }
}

