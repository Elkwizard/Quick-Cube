const QC = {};
QC.cube = (x, y, z, r = 255, g = 0, b = 0, topMask = false, bottomMask = false, leftMask = false, rightMask = false, frontMask = false, backMask = false) => {
	//lighting and textures
	let light, medium, dark;
	let QCshadowLight, QCshadowMedium, QCshadowDark;
	if (r instanceof Image) {
		QCshadowLight = `rgba(0, 0, 0, ${QC.lightT})`;
		QCshadowMedium = `rgba(0, 0, 0, ${QC.mediumT})`;
		QCshadowDark = `rgba(0, 0, 0, ${QC.darkT})`;
		light = r;
		medium = g;
		dark = b;
	} else {
		light = `rgb(${r * (1 - QC.lightT)}, ${g * (1 - QC.lightT)}, ${b * (1 - QC.lightT)})`;
		medium = `rgb(${r * (1 - QC.mediumT)}, ${g * (1 - QC.mediumT)}, ${b * (1 - QC.mediumT)})`;
		dark = `rgb(${r * (1 - QC.darkT)}, ${g * (1 - QC.darkT)}, ${b * (1 - QC.darkT)})`;
	}

	//color processing done
	QC.colorBakedCube(x, y, z, light, medium, dark, QCshadowLight, QCshadowMedium, QCshadowDark, topMask, bottomMask, leftMask, rightMask, frontMask, backMask);
}
QC.batch = [];
QC.colorBakedCube = (x, y, z, light, medium, dark, QCshadowLight, QCshadowMedium, QCshadowDark, topMask, bottomMask, leftMask, rightMask, frontMask, backMask) => {
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

	//world transform
	for (let i = 0; i < 8; i++) QC.worldTransform(allPoints[i]);

	let mid = QC.middle(allPoints);
	let zAvg = QC.sqrMag(mid);

	//behind screen culling
	if (mid.z < 0) return;
	QC.needsProcess = true;
	
	//construct sides
	const allSides = [
		QC.quad([D, C, B, A], medium, QCshadowMedium),
		QC.quad([A2, B2, C2, D2], medium, QCshadowMedium),
		QC.quad([A, B, B2, A2], light, QCshadowLight),
		QC.quad([C, D, D2, C2], dark, QCshadowDark),
		QC.quad([D, A, A2, D2], medium, QCshadowMedium),
		QC.quad([B, C, C2, B2], medium, QCshadowMedium)
	];
	//mask off invisible sides
	const [front, back, top, bottom, left, right] = allSides;
	if (!frontMask && QC.facingAway(front)) frontMask = true;
	if (!backMask && QC.facingAway(back)) backMask = true;
	if (!topMask && QC.facingAway(top)) topMask = true;
	if (!bottomMask && QC.facingAway(bottom)) bottomMask = true;
	if (!leftMask && QC.facingAway(left)) leftMask = true;
	if (!rightMask && QC.facingAway(right)) rightMask = true;
	
	//screen transform (project to screen)
	for (let i = 0; i < allPoints.length; i++) QC.screenTransform(allPoints[i]);

	//offscreen culling
	let mid2 = QC.middle(allPoints);
	let thresh = QC.worldCubeSize;
	if (mid2.x < -thresh || mid2.y < -thresh || mid2.x > QC.width + thresh || mid2.y > QC.height + thresh) return;


	//mask sides
	let sides = [];
	if (!frontMask) sides.push(front);
	if (!backMask) sides.push(back);
	if (!topMask) sides.push(top);
	if (!bottomMask) sides.push(bottom);
	if (!leftMask) sides.push(left);
	if (!rightMask) sides.push(right);
	const cube = { z: zAvg, sides };
	QC.batch.push(cube);
};
QC.sqrMag = vec => vec.x ** 2 + vec.y ** 2 + vec.z ** 2;
QC.setRotX = angle => [QC.rotation.cosX, QC.rotation.sinX] = [Math.cos(angle), Math.sin(angle)];
QC.setRotY = angle => [QC.rotation.cosY, QC.rotation.sinY] = [Math.cos(angle), Math.sin(angle)];
QC.facingAway = quad => {
	//get vectors
	let [vecA, vecB, vecD, vecC] = quad.vertices;
	
	// -- actual operations --
	// //vector from A to B
	// let dxA = vecB.x - vecA.x;
	// let dyA = vecB.y - vecA.y;
	// let dzA = vecB.z - vecA.z;

	// //vector to from C to B
	// let dxC = vecB.x - vecC.x;
	// let dyC = vecB.y - vecC.y;
	// let dzC = vecB.z - vecC.z;

	// //middle of quad
	// let mX = (vecA.x + vecB.x + vecC.x + vecD.x) / 4;
	// let mY = (vecA.y + vecB.y + vecC.y + vecD.y) / 4;
	// let mZ = (vecA.z + vecB.z + vecC.z + vecD.z) / 4;

	// //normal of quad (A->B x C->B)
	// let nX = dyA * dzC - dzA * dyC;
	// let nY = dzA * dxC - dxA * dzC;
	// let nZ = dxA * dyC - dyA * dxC;

	// //dot of n x c
	// let dot = mX * nX + mY * nY + mZ * nZ;

	// return dot <= 0;

	
	//minified
	return ((vecA.x + vecC.x) / 2) * ((vecB.y - vecA.y) * (vecB.z - vecC.z) - (vecB.z - vecA.z) * (vecB.y - vecC.y)) + ((vecA.y + vecC.y) / 2) * ((vecB.z - vecA.z) * (vecB.x - vecC.x) - (vecB.x - vecA.x) * (vecB.z - vecC.z)) + ((vecA.z + vecC.z) / 2) * ((vecB.x - vecA.x) * (vecB.y - vecC.y) - (vecB.y - vecA.y) * (vecB.x - vecC.x)) <= 0;
};
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
	if (color.src) {
		QC.skewImage(color, points[1], points[2], points[3]);
		color = quad.shadow;
	}
	QC.c.fillStyle = color;
	QC.c.beginPath();
	QC.c.moveTo(points[0].x, points[0].y);
	QC.c.lineTo(points[1].x, points[1].y);
	QC.c.lineTo(points[2].x, points[2].y);
	QC.c.lineTo(points[3].x, points[3].y);
	QC.c.lineTo(points[0].x, points[0].y);
	QC.c.fill();

	// QC.c.strokeStyle = "black";
	// QC.c.stroke();
};
QC.middle = points => {
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
QC.scale = (vec, scale) => QC.vector(vec.x * scale, vec.y * scale, vec.z * scale);
QC.viewRay = () => {
	let view = QC.vector(0, 0, 1);
	if (QC.firstPerson) {
		let aX = -Math.atan2(QC.rotation.sinX, QC.rotation.cosX);
		let aY = -Math.atan2(QC.rotation.sinY, QC.rotation.cosY);
		QC.rotYZ(view, Math.cos(aX), Math.sin(aX));
		QC.rotXZ(view, Math.cos(aY), Math.sin(aY));
	}
	return view;
}
QC.moveCamera = vec => {
	QC.offset(QC.camera, vec);
	if (QC.firstPerson) QC.offset(QC.origin, vec);
};
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
					let rightMask = get(i + 1, j, k);
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
				
				//find obstructions for shadow casting
				let shadow = false;
				if (QC.shadows) if (j > 2) for (let w = j - 1; w >= 0; w--) {
					if (map[i][w][k].exists) {
						shadow = true;
						if (w === j - 1) shadow = false;
						break;
					}
				}

				//baking lighting and textures
				let lightT = shadow ? QC.shadowT : QC.lightT;
				let light, medium, dark;
				let QCshadowLight, QCshadowMedium, QCshadowDark;
				if (r instanceof Image) {
					QCshadowLight = `rgba(0, 0, 0, ${lightT})`;
					QCshadowMedium = `rgba(0, 0, 0, ${QC.mediumT})`;
					QCshadowDark = `rgba(0, 0, 0, ${QC.darkT})`;
					light = r;
					medium = g;
					dark = b;
				} else {
					light = `rgb(${r * (1 - lightT)}, ${g * (1 - lightT)}, ${b * (1 - lightT)})`;
					medium = `rgb(${r * (1 - QC.mediumT)}, ${g * (1 - QC.mediumT)}, ${b * (1 - QC.mediumT)})`;
					dark = `rgb(${r * (1 - QC.darkT)}, ${g * (1 - QC.darkT)}, ${b * (1 - QC.darkT)})`;
				}

				calls.push([i * scale + ox, j * scale + oy, k * scale + oz, light, medium, dark, QCshadowLight, QCshadowMedium, QCshadowDark, ...masks]);
			}
	return calls;
};
QC.skewImage = (image, a, c, d) => {
	let width = (d.x - c.x) || 0.1;
	let height = (c.y - a.y) || 0.1;
	let sw = Math.sign(width);
	let sh = Math.sign(height);
	width = Math.abs(width);
	height = Math.abs(height);
	let x = a.x;
	let y = a.y;
	let skewX = (c.x - a.x) / height;
	let skewY = (d.y - c.y) / width;

	QC.c.save();
	QC.c.translate(x, y);
	let t = QC.c.getTransform();
	t.b = skewY || 0;
	t.c = skewX || 0;
	t.a = sw;
	t.d = sh;
	QC.c.setTransform(t);
	QC.c.drawImage(image, 0, 0, width, height);
	QC.c.restore();
};
QC.worldToScreen = vec => {
	let cvec = QC.vector(vec.x, vec.y, vec.z);
	QC.worldTransform(cvec);
	QC.screenTransform(cvec);
	return cvec;
};
QC.lightT = 0;
QC.shadowT = 0.5;
QC.mediumT = 0.4;
QC.darkT = 0.8;
QC.submitMap = map => {
	for (let i = 0; i < map.length; i++) {
		let m = map[i];
		QC.colorBakedCube(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10], m[11], m[12], m[13], m[14]);
	}
};
QC.mapEntry = (exists, r, g, b) => ({ exists, r, g, b });
QC.quad = (vertices, color, shadow) => ({ vertices, color, shadow });
QC.vector = (x, y, z) => ({ x, y, z });
QC.screenTransform = vec => {
	let z = Math.max(0.01, vec.z);
	vec.x = QC.halfWidth * vec.x / z + QC.halfWidth;
	vec.y = QC.halfWidth * vec.y / z + QC.halfHeight;
};
QC.worldTransform = vec => {
	QC.offset(vec, QC.origin, -1);
	QC.rotXZ(vec, QC.rotation.cosY, QC.rotation.sinY);
	QC.rotYZ(vec, QC.rotation.cosX, QC.rotation.sinX);
	QC.offset(vec, QC.origin);
	QC.offset(vec, QC.camera, -1);
};
QC.needsProcess = false;
QC.config = ({ camera = QC.vector(0, 0, 0), context = null, cubeSize = 1, rotation = { cosX: 1, sinX: 0, cosY: 1, sinY: 0 }, origin = QC.vector(0, 0, 0), shadows = true, firstPerson = false }) => {
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
		if (firstPerson) QC.origin = QC.vector(QC.camera.x, QC.camera.y, QC.camera.z);
		QC.worldCubeSize = cubeSize * QC.halfWidth;
	}
};