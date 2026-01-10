window.addEventListener('load', () => {
    const canvas = document.getElementById('emulator_target');

    // Resize canvas to full screen
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Wait until IodineGBA is ready
    function startEmulator() {
        if (!window.Iodine) {
            console.error('Emulator not loaded yet.');
            return;
        }

        // Create the emulator instance
        const emulator = new Iodine({
            canvas: canvas
        });

        // Get the ROM ID from URL hash or default
        const romId = window.location.hash ? window.location.hash.substring(1) : 'default-rom';
        const romPath = `roms/${romId}.gba`; // Make sure your GBA ROMs are in a folder called "roms"

        // Load the ROM
        fetch(romPath)
            .then(res => res.arrayBuffer())
            .then(buffer => {
                emulator.loadROM(buffer);
                emulator.run(); // start the emulator
            })
            .catch(err => console.error('Failed to load ROM:', err));
    }

    // Retry a few times if Iodine is not ready yet
    let attempts = 0;
    const interval = setInterval(() => {
        if (window.Iodine) {
            clearInterval(interval);
            startEmulator();
        } else if (attempts > 20) {
            clearInterval(interval);
            console.error('Emulator not ready after multiple attempts.');
        }
        attempts++;
    }, 200);
});
