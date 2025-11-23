  const filteredConversations = React.useMemo(() => {
    debugLog.log(' Filtro ejecutado:', {
      totalConversations: conversations?.length,
      searchTerm,
      selectedFilter,
      hasSearchResults: !!searchResults,
      searchResultsCount: searchResults?.length || 0,
      appliedFilters: appliedFilters ? 'SI' : 'NO'
    });

    let result = conversations || [];

    // Si hay resultados de búsqueda del backend, usarlos
    if (searchResults !== null) {
      debugLog.log(' Usando resultados de búsqueda backend:', searchResults.length);
      result = searchResults;
    } else if (searchTerm) {
      // Con busqueda local, filtrar por texto
      result = result.filter(conversation => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = conversation.contact?.name?.toLowerCase()?.includes(searchLower);
        const lastMessageMatch = conversation.last_message?.content?.toLowerCase()?.includes(searchLower);
        const allMessagesMatch = conversation.messages?.some((msg: any) =>
          msg.content?.toLowerCase()?.includes(searchLower)
        );
        const labelMatch = conversation.labels?.some((label: any) =>
          label.title?.toLowerCase()?.includes(searchLower)
        );
        const contactMatch = conversation.contact?.email?.toLowerCase()?.includes(searchLower) ||
                             conversation.contact?.phone_number?.includes(searchTerm);
        return nameMatch || lastMessageMatch || allMessagesMatch || labelMatch || contactMatch;
      });
    }

    // Aplicar filtro de pestaña (Todo/Mío/Asignadas)
    if (selectedFilter === 'mine') {
      result = result.filter(c => c.assignee_id === 1);
    } else if (selectedFilter === 'assigned') {
      result = result.filter(c => c.assignee_id && c.assignee_id !== 1);
    }

    //  NUEVO: Aplicar filtros avanzados
    if (appliedFilters) {
      debugLog.log(' Aplicando filtros avanzados:', appliedFilters);

      // Filtrar por estado
      if (appliedFilters.status && appliedFilters.status.length > 0) {
        result = result.filter(conv => appliedFilters.status.includes(conv.status));
        debugLog.log(\   Filtro Estado: \  \ resultados\);
      }

      // Filtrar por prioridad
      if (appliedFilters.priority && appliedFilters.priority.length > 0) {
        result = result.filter(conv => appliedFilters.priority.includes(conv.priority));
        debugLog.log(\   Filtro Prioridad: \  \ resultados\);
      }

      // Filtrar por etiquetas
      if (appliedFilters.labels && appliedFilters.labels.length > 0) {
        result = result.filter(conv => {
          if (!conv.labels || conv.labels.length === 0) return false;
          return conv.labels.some(label => appliedFilters.labels.includes(label));
        });
        debugLog.log(\   Filtro Etiquetas: \  \ resultados\);
      }

      // Filtrar solo no leídas
      if (appliedFilters.unreadOnly) {
        result = result.filter(conv => conv.unread_count > 0);
        debugLog.log(\   Filtro No Leídas  \ resultados\);
      }

      // Filtrar por asignación
      if (appliedFilters.assignedTo && appliedFilters.assignedTo !== 'all') {
        if (appliedFilters.assignedTo === 'me') {
          result = result.filter(conv => conv.assignee_id === 1);
        } else if (appliedFilters.assignedTo === 'others') {
          result = result.filter(conv => conv.assignee_id && conv.assignee_id !== 1);
        } else if (appliedFilters.assignedTo === 'unassigned') {
          result = result.filter(conv => !conv.assignee_id);
        }
        debugLog.log(\   Filtro Asignación: \  \ resultados\);
      }

      // Filtrar por rango de fechas
      if (appliedFilters.dateRange && appliedFilters.dateRange !== 'all') {
        const now = new Date();
        let startDate: Date | null = null;

        if (appliedFilters.dateRange === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (appliedFilters.dateRange === 'week') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (appliedFilters.dateRange === 'month') {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (appliedFilters.dateRange === 'custom' && appliedFilters.customDateFrom) {
          startDate = new Date(appliedFilters.customDateFrom);
        }

        if (startDate) {
          result = result.filter(conv => {
            const convDate = conv.timestamp 
              ? new Date(conv.timestamp * 1000)
              : conv.updated_at 
                ? new Date(conv.updated_at)
                : null;
            
            if (!convDate) return false;

            const inRange = convDate >= startDate;
            
            if (appliedFilters.dateRange === 'custom' && appliedFilters.customDateTo) {
              const endDate = new Date(appliedFilters.customDateTo);
              endDate.setHours(23, 59, 59, 999);
              return inRange && convDate <= endDate;
            }

            return inRange;
          });
          debugLog.log(\   Filtro Fecha: \  \ resultados\);
        }
      }
    }

    debugLog.log(\ Total final: \ conversaciones\);
    return result;
  }, [conversations, searchTerm, selectedFilter, searchResults?.length ?? 0, appliedFilters]);
