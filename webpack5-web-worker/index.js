const worker = new Worker(new URL("./wasted.time.worker.js", import.meta.url), {
	name: "wastedTime",
	/* webpackEntryOptions: { filename: "workers/[name].js" } */
});
worker.onmessage = e => {
	console.log(e.data.value);
};
