const generateQR = async () => {
  setLoading(true);
  setError(null);

  try {
    router.post('/whatsapp/generate-qr', {}, {
      onSuccess: (page) => {
        const data = page.props.data;
        if (data && data.success) {
          setQRCode(data.qr_code);
        } else {
          setError(data?.message || 'Error generating QR code');
        }
        setLoading(false);
      },
      onError: (errors) => {
        console.error('Error generating QR code:', errors);
        setError('Error de conexión');
        setLoading(false);
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    setError('Error de conexión');
    setLoading(false);
  }
};
