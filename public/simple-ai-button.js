console.log('AI Button: Loading...');
setTimeout(function() {
    let btn = document.createElement('button');
    btn.innerHTML = 'Mejorar con IA';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 20px;background:#667eea;color:white;border:none;border-radius:25px;cursor:pointer;z-index:9999;';
    btn.onclick = function() {
        let textarea = document.querySelector('textarea');
        if (!textarea || !textarea.value.trim()) {
            alert('Ingresa una descripcion en el campo de texto');
            return;
        }
        btn.innerHTML = 'Mejorando...';
        btn.disabled = true;
        fetch('/improve.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: textarea.value })
        }).then(function(response) {
            return response.json();
        }).then(function(data) {
            if (data.success) {
                textarea.value = data.improved_description;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                alert('Descripcion mejorada!');
            }
        }).catch(function() {
            alert('Error de conexion');
        }).finally(function() {
            btn.innerHTML = 'Mejorar con IA';
            btn.disabled = false;
        });
    };
    document.body.appendChild(btn);
    console.log('AI Button: Added successfully');
}, 2000);
