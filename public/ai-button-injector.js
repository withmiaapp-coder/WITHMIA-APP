// Script para agregar el botón de IA al onboarding
console.log('AI Button Injector: Script cargado');

function addAIButton() {
    console.log('AI Button Injector: Buscando textarea...');
    
    // Buscar el textarea de descripción de empresa con varios selectores
    let textarea = document.querySelector('textarea[placeholder*=" empresa\]') ||
 document.querySelector('textarea[placeholder*=\Describe\]') ||
 document.querySelector('textarea') ||
 document.querySelector('input[type=\text\][placeholder*=\empresa\]');
 
 console.log('AI Button Injector: Textarea encontrado:', textarea);
 
 if (textarea && !document.getElementById('ai-button-mejora')) {
 console.log('AI Button Injector: Creando botón...');
 
 // Crear el botón
 const aiButton = document.createElement('button');
 aiButton.id = 'ai-button-mejora';
 aiButton.type = 'button';
 aiButton.innerHTML = ' Mejorar con IA';
 aiButton.style.cssText = 'margin-top:10px;padding:8px 16px;background:#667eea;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;display:block;';
 
 // Función para mejorar descripción
 aiButton.onclick = async function() {
 console.log('AI Button: Botón clickeado');
 
 if (!textarea.value.trim()) {
 alert('Por favor, ingresa una descripción para mejorar');
 return;
 }
 
 const originalText = aiButton.innerHTML;
 aiButton.innerHTML = ' Mejorando...';
 aiButton.disabled = true;
 
 try {
 console.log('AI Button: Enviando request...');
 const response = await fetch('/improve.php', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ description: textarea.value })
 });
 
 const data = await response.json();
 console.log('AI Button: Respuesta recibida:', data);
 
 if (data.success) {
 textarea.value = data.improved_description;
 // Disparar evento para React
 textarea.dispatchEvent(new Event('input', { bubbles: true }));
 textarea.dispatchEvent(new Event('change', { bubbles: true }));
 }
 } catch (error) {
 console.error('AI Button: Error:', error);
 alert('Error al conectar con el servidor');
 } finally {
 aiButton.innerHTML = originalText;
 aiButton.disabled = false;
 }
 };
 
 // Insertar el botón después del textarea
 const container = textarea.parentNode;
 container.appendChild(aiButton);
 
 console.log('AI Button Injector: Botón agregado exitosamente');
 } else {
 console.log('AI Button Injector: No se encontró textarea o botón ya existe');
 }
}

// Intentar múltiples veces para asegurar que React haya renderizado
document.addEventListener('DOMContentLoaded', addAIButton);
setTimeout(addAIButton, 1000);
setTimeout(addAIButton, 2000);
setTimeout(addAIButton, 3000);

// También cuando el contenido cambie
const observer = new MutationObserver(addAIButton);
observer.observe(document.body, { childList: true, subtree: true });
