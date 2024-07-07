
**Wasm (Linux, macOS or WSL)**
```bash
../../make --target wasm --compile
# Copy resulting armorcore.wasm file to Deployment
# Copy index.html to Deployment
# Copy https://github.com/armory3d/armorcore/tree/main/sources/backends/data/wasm/JS-Sources to Deployment
# Todo:
# start.js has hard-coded .wasm file name: https://github.com/armory3d/armorcore/tree/main/sources/backends/data/wasm/JS-Sources/start.js#L48
# memory.c has hard-coded size: https://github.com/armory3d/armorcore/tree/main/sources/libs/miniClib/memory.c#L6
```