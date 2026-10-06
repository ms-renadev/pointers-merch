const { data: orders } = await supabase
  .from('orders')
  .select('*, order_items(*)')
  .order('created_at', { ascending: false });