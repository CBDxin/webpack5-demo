function a() {
	return new Promise(function (resolve, reject) {
		setTimeout(() => {
			resolve("done");
		}, 2000);
	});
}

const res = await a();
console.log(res);
