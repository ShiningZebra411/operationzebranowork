window.addEventListener('load', () => {
    const canvas = document.getElementById('emulator_target');
    const gameList = document.getElementById('gameList');

    // Scale canvas
    function resizeCanvas() {
        const scale = Math.min(window.innerWidth / 240, window.innerHeight / 160);
        canvas.style.width = `${240 * scale}px`;
        canvas.style.height = `${160 * scale}px`;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // List all ROMs in /roms/ folder
    const roms = ['default-rom', 'pokemon', 'mario']; // Add all your ROM IDs here
    roms.forEach(romId => {
        const btn = document.createElement('a');
        btn.href = `#${romId}`;
        btn.textContent = romId.replace(/-/g, ' ').toUpperCase();
        btn.className = 'game-button';
        gameList.appendChild(btn);
    });

    // Start emulator
    function startEmulator() {
        if (!window.Iodine) {
            console.error('Emulator not loaded yet.');
            return;
        }

        const emulator = new Iodine({ canvas: canvas });

        // Get ROM from URL hash
        const romId = window.location.hash ? window.location.hash.substring(1) : 'default-rom';
        const romPath = `roms/${romId}.gba`;

        fetch(romPath)
            .then(res => {
                if (!res.ok) throw new Error(`ROM not found: ${romPath}`);
                return res.arrayBuffer();
            })
            .then(buffer => {
                emulator.loadROM(buffer);
                emulator.run();
            })
            .catch(err => console.error(err));
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

    // Reload emulator if user clicks a different game
    window.addEventListener('hashchange', startEmulator);
});
