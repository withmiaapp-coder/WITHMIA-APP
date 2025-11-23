// ============================================================================
// UTILIDAD: Colores y estilos para conversaciones
// ============================================================================

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'text-red-500 bg-red-100';
    case 'high':
      return 'text-orange-500 bg-orange-100';
    case 'medium':
      return 'text-blue-500 bg-blue-100';
    default:
      return 'text-gray-500 bg-gray-100';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'open':
      return 'text-green-500 bg-green-100';
    case 'pending':
      return 'text-yellow-500 bg-yellow-100';
    case 'resolved':
      return 'text-gray-500 bg-gray-100';
    default:
      return 'text-gray-500 bg-gray-100';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'open':
      return 'Abierto';
    case 'pending':
      return 'Pendiente';
    case 'resolved':
      return 'Resuelto';
    default:
      return status;
  }
};

export const getPriorityText = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'Urgente';
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Media';
    case 'low':
      return 'Baja';
    default:
      return priority;
  }
};
