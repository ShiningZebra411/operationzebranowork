window.addEventListener('load', () => {
    const canvas = document.getElementById('emulator_target');
    let emulator = null;

    // Scale canvas to fit window while keeping 240x160 aspect ratio
    function resizeCanvas() {
        const scale = Math.min(window.innerWidth / 240, window.innerHeight / 160);
        canvas.style.width = `${240 * scale}px`;
        canvas.style.height = `${160 * scale}px`;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Start the emulator
    function startEmulator() {
        if (!window.Iodine) {
            console.error('IodineGBA not loaded yet.');
            return;
        }

        // If an emulator is already running, stop it
        if (emulator) {
            emulator.stop();
            emulator = null;
        }

        emulator = new Iodine({ canvas });

        // Determine ROM from URL hash
        const romId = window.location.hash ? window.location.hash.substring(1) : 'default-rom';
        const romPath = `roms/${romId}.gba`;

        fetch(romPath)
            .then(response => {
                if (!response.ok) throw new Error(`ROM not found: ${romPath}`);
                return response.arrayBuffer();
            })
            .then(buffer => {
                emulator.loadROM(buffer);
                emulator.run();
                console.log(`Loaded ROM: ${romId}`);
            })
            .catch(err => {
                console.error(err);
                alert(`Failed to load ROM: ${romId}`);
            });
    }

    // Retry until Iodine is ready
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

    // Reload emulator when hash changes (game button clicked)
    window.addEventListener('hashchange', startEmulator);
});
