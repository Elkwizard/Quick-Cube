const QC = { };
QC.cube = (x, y, z, r = 255, g = 0, b = 0, topMask = false, bottomMask = false, leftMask = false, rightMask = false, frontMask = false, backMask = false, lightT = QC.lightT, mediumT = QC.mediumT, darkT = QC.darkT) => {
	const w = QC.cubeSize;
	//front
	let A = QC.vector(x, y, z);
	let B = QC.vector(x + w, y, z);
	let C = QC.vector(x + w, y + w, z);
	let D = QC.vector(x, y + w, z);
	//back
	let A2 = QC.vector(x, y, z + w);
	let B2 = QC.vector(x + w, y, z + w);
	let C2 = QC.vector(x + w, y + w, z + w);
	let D2 = QC.vector(x, y + w, z + w);

	const allPoints = [A, B, C, D, A2, B2, C2, D2];
	for (let point of allPoints) {
		QC.offset(point, QC.origin, -1);
		QC.rotXZ(point, QC.rotation.cosY, QC.rotation.sinY);
		QC.rotYZ(point, QC.rotation.cosX, QC.rotation.sinX);
		QC.offset(point, QC.origin);
		QC.offset(point, QC.camera, -1);
	}

	let mid = QC.middle(allPoints);
	let zAvg = QC.sqrMag(mid);

	if (mid.z < w * 2) return;
	QC.needsProcess = true;

	for (let point of allPoints) QC.screenTransform(point);

	let light = `rgb(${r * (1 - lightT)}, ${g * (1 - lightT)}, ${b * (1 - lightT)})`;
	let medium = `rgb(${r * (1 - mediumT)}, ${g * (1 - mediumT)}, ${b * (1 - mediumT)})`;
	let dark = `rgb(${r * (1 - darkT)}, ${g * (1 - darkT)}, ${b * (1 - darkT)})`;
	let sides = [];
	if (!frontMask) sides.push(QC.quad([A, B, C, D], medium)); 
	if (!backMask) sides.push(QC.quad([A2, B2, C2, D2], medium));
	if (!topMask) sides.push(QC.quad([A, B, B2, A2], light));
	if (!bottomMask) sides.push(QC.quad([C, D, D2, C2], dark));
	if (!leftMask) sides.push(QC.quad([D, A, A2, D2], medium));
	if (!rightMask) sides.push(QC.quad([B, C, C2, B2], medium));
	const cube = { z: zAvg, sides };
	QC.batch.push(cube);
}
QC.batch = [];
QC.sqrMag = vec => vec.x ** 2 + vec.y ** 2 + vec.z ** 2;
QC.setRotX = angle => [QC.rotation.cosX, QC.rotation.sinX] = [Math.cos(angle), Math.sin(angle)];
QC.setRotY = angle => [QC.rotation.cosY, QC.rotation.sinY] = [Math.cos(angle), Math.sin(angle)];
QC.mouseRotate = (x, y) => {
	QC.needsProcess = true;
	if (QC.firstPerson) {
		x = QC.width - x;
		y = QC.height - y;
	}
	let X = -(y / QC.height - 0.5) * Math.PI;
	let Y = -(x / QC.width - 0.5) * 2 * Math.PI;
	QC.setRotX(X);
	QC.setRotY(Y);
};
QC.process = () => {
	for (let i = 0; i < QC.batch.length; i++) {
		let cube = QC.batch[i];
		for (let j = 0; j < cube.sides.length; j++) {
			let tv = cube.sides[j].vertices;
			let tz = (tv[0].z + tv[1].z + tv[2].z + tv[3].z) / 4;
			cube.sides[j].z = tz;
		}
		cube.sides.sort((a, b) => b.z - a.z);
	}
	QC.batch.sort((a, b) => b.z - a.z);
};
QC.render = () => {
	if (QC.needsProcess) QC.process();
	for (let i = 0; i < QC.batch.length; i++) {
		let cube = QC.batch[i];
		for (let j = 0; j < cube.sides.length; j++) QC.drawQuad(cube.sides[j]);
	}
};
QC.clear = () => {
	QC.batch = [];
};
QC.drawQuad = quad => {
	let points = quad.vertices;
	let color = quad.color;
	QC.c.beginPath();
	QC.c.fillStyle = color;
	QC.c.moveTo(points[0].x, points[0].y);
	QC.c.lineTo(points[1].x, points[1].y);
	QC.c.lineTo(points[2].x, points[2].y);
	QC.c.lineTo(points[3].x, points[3].y);
	QC.c.lineTo(points[0].x, points[0].y);
	QC.c.fill();
};
QC.middle = (points) => {
	const acc = QC.vector(0, 0, 0);
	const len = points.length;
	for (let i = 0; i < points.length; i++) {
		const p = points[i];
		acc.x += p.x / len;
		acc.y += p.y / len;
		acc.z += p.z / len;
	}
	return acc;
}
QC.offset = (vec, vec2, d = 1) => {
	vec.x += vec2.x * d;
	vec.y += vec2.y * d;
	vec.z += vec2.z * d;
}
QC.rotXY = (vec, cos, sin) => {
	let t_x = vec.x * cos - vec.y * sin;
	let t_y = vec.x * sin + vec.y * cos;
	vec.x = t_x;
	vec.y = t_y;
};
QC.rotXZ = (vec, cos, sin) => {
	let t_x = vec.x * cos - vec.z * sin;
	let t_z = vec.x * sin + vec.z * cos;
	vec.x = t_x;
	vec.z = t_z;
};
QC.rotYZ = (vec, cos, sin) => {
	let t_y = vec.y * cos - vec.z * sin;
	let t_z = vec.y * sin + vec.z * cos;
	vec.y = t_y;
	vec.z = t_z;
};
QC.processMap = (map, offset = QC.vector(0, 0, 0)) => {
	const { x: ox, y: oy, z: oz } = offset;
	const scale = QC.cubeSize;
	let width = map.length;
	let height = map[0].length;
	let depth = map[0][0].length;

	let calls = [];
	let nMap = [];
	const get = (i, j, k) => map[i] && map[i][j] && map[i][j][k] && map[i][j][k].exists;
	for (let i = 0; i < width; i++) {
		nMap.push([]);
		for (let j = 0; j < height; j++) {
			nMap[i].push([]);
			for (let k = 0; k < depth; k++) {
				if (map[i][j][k].exists) {
					let leftMask = get(i - 1, j, k);
					let rightMask =	get(i + 1, j, k);
					let topMask = get(i, j - 1, k);
					let bottomMask = get(i, j + 1, k);
					let frontMask = get(i, j, k - 1);
					let backMask = get(i, j, k + 1);
					if (leftMask && rightMask && topMask && bottomMask && frontMask && backMask) {
						nMap[i][j].push(QC.mapEntry(false));
						continue;
					}
					
					let cube = map[i][j][k];
					cube.masks = [topMask, bottomMask, leftMask, rightMask, frontMask, backMask];
					nMap[i][j].push(cube);
				} else nMap[i][j].push(QC.mapEntry(false));
			}
		}
	}
	for (let i = 0; i < width; i++)
		for (let j = 0; j < height; j++)
			for (let k = 0; k < depth; k++) {
				let cube = nMap[i][j][k];
				let { exists, r, g, b } = cube;
				if (!exists) continue;
				let masks = cube.masks;
				let shadow = false;
				if (QC.shadows) if (j > 2) for (let w = j - 1; w >= 0; w--) {
					if (map[i][w][k].exists) {
						shadow = true;
						if (w === j - 1) shadow = false;
						break;
					}
				}
				calls.push([i * scale + ox, j * scale + oy, k * scale + oz, r, g, b, ...masks, shadow ? 0.5 : QC.lightT, QC.mediumT, QC.darkT]);
			}
	return calls;
}
QC.lightT = 0;
QC.mediumT = 0.4;
QC.darkT = 0.8;
QC.submitMap = map => {
	for (let i = 0; i < map.length; i++) QC.cube(...map[i]);
};
QC.mapEntry = (exists, r, g, b) => ({ exists, r, g, b });
QC.quad = (vertices, color) => ({ vertices, color });
QC.vector = (x, y, z) => ({ x, y, z });
QC.screenTransform = (res) => {
	res.x = QC.halfWidth * res.x / res.z + QC.halfWidth;
	res.y = QC.halfWidth * res.y / res.z + QC.halfHeight;
};
QC.needsProcess = false;
QC.config = ({ camera = QC.vector(0, 0, 0), context = null, cubeSize = 1, rotation = { cosX: 1, sinX: 0, cosY: 1, sinY: 0 }, origin = QC.vector(0, 0, 0), shadows = true, firstPerson = true }) => {
	if (!context) {
		throw new Error("No Context Provided");
	} else {
		QC.camera = camera;
		QC.c = context;
		QC.rotation = rotation;
		QC.origin = origin;
		QC.cubeSize = cubeSize;
		QC.halfWidth = context.canvas.width / 2;
		QC.halfHeight = context.canvas.height / 2;
		QC.width = QC.halfWidth * 2;
		QC.height = QC.halfHeight * 2;
		QC.shadows = shadows;
		QC.firstPerson = firstPerson;
	}
};