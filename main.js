window.addEventListener('load', () => {
    const canvas = document.getElementById('emulator_target');

    // Scale canvas to fit window while keeping 240x160 aspect ratio
    function resizeCanvas() {
        const scale = Math.min(window.innerWidth / 240, window.innerHeight / 160);
        canvas.style.width = `${240 * scale}px`;
        canvas.style.height = `${160 * scale}px`;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Wait until IodineGBA is loaded
    function startEmulator() {
        if (!window.Iodine) {
            console.error('Emulator not loaded yet.');
            return;
        }

        // Create emulator instance
        const emulator = new Iodine({
            canvas: canvas
        });

        // Determine which ROM to load
        const romId = window.location.hash ? window.location.hash.substring(1) : 'default-rom';
        const romPath = `roms/${romId}.gba`; // Place ROMs in "roms/" folder

        // Load ROM
        fetch(romPath)
            .then(response => {
                if (!response.ok) throw new Error(`ROM not found: ${romPath}`);
                return response.arrayBuffer();
            })
            .then(buffer => {
                emulator.loadROM(buffer);
                emulator.run();
            })
            .catch(err => console.error(err));
    }

    // Retry until IodineGBA is ready
    let attempts = 0;
    const interval = setInterval(() => {
        if (window.Iodine) {
            clearInterval(interval);
            startEmulator();
        } else if (attempts > 20) {
            clearInterval(interval);
            console.error('Emulator not ready.');
        }
        attempts++;
    }, 200);
});
