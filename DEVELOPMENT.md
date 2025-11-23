# Guía de Desarrollo - WithMia

##  Cómo hacer cambios

### Opción 1: Editar directamente en GitHub (más fácil)
1. Ve a https://github.com/withmiaapp-coder/mia-app
2. Navega al archivo que quieres editar
3. Click en el ícono del lápiz (Edit)
4. Haz tus cambios
5. Click en " Commit changes\ El deploy es automático

### Opción 2: Trabajar localmente
\\\ash
# Clonar repositorio
git clone https://github.com/withmiaapp-coder/mia-app.git
cd mia-app

# Hacer cambios
# ... edita archivos ...

# Commit y push
git add .
git commit -m \Descripción de cambios\
git push origin main
# Deploy automático se ejecuta
\\\

## Estructura del Proyecto

\\\
mia-app/
 app/ # Backend Laravel
 Http/Controllers/ # Controladores
 Models/ # Modelos de base de datos
 Services/ # Lógica de negocio
 resources/
 js/ # Frontend React/TypeScript
 components/ # Componentes React
 pages/ # Páginas Inertia
 hooks/ # React Hooks
 views/ # Plantillas Blade
 routes/ # Definición de rutas
 database/migrations/ # Migraciones de BD
 .github/workflows/ # GitHub Actions
\\\

## Deploy Automático

**Se ejecuta automáticamente en cada push a main:**

1. Git pull en servidor
2. Composer install (dependencias PHP)
3. NPM install + build (frontend)
4. Migraciones de BD
5. Cache de config/rutas/vistas
6. Reinicio PHP-FPM

**Tiempo estimado:** 2-3 minutos

## Variables de Entorno

El archivo \.env\ está en el servidor y NO se versiona en Git (por seguridad).

## Convenciones de Commits

- \eat: nueva funcionalidad\
- \ix: corrección de bug\
- \efactor: refactorización de código\
- \docs: documentación\
- \style: formato/estilo\

## Debugging

Ver logs en el servidor:
\\\ash
ssh -i key.pem -p 2222 ubuntu@18.231.188.244
tail -f /var/www/mia-app/storage/logs/laravel.log
\\\

## Monitoreo

- **Aplicación:** https://app.withmia.com
- **GitHub Actions:** https://github.com/withmiaapp-coder/mia-app/actions
- **Servidor:** 18.231.188.244:2222

## Soporte

Para problemas o dudas, revisa los logs o contacta al equipo técnico.
