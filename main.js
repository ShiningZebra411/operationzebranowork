// main.js
window.addEventListener('load', () => {
    const canvas = document.getElementById('emulator_target');

    // Resize canvas to full screen
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Start emulator immediately
    const romId = window.location.hash ? window.location.hash.substring(1) : 'default-rom';
    
    if (window.Iodine && window.Iodine.loadROM) {
        fetch(`${romId}.gba`)
            .then(res => res.arrayBuffer())
            .then(buffer => {
                window.Iodine.loadROM(buffer);
            })
            .catch(err => console.error('Failed to load ROM:', err));
    } else {
        console.error('Emulator not ready');
    }
});
