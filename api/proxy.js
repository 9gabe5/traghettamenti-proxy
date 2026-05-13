export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { numero } = req.query;
  if (!numero) return res.status(400).json({ error: 'Numero treno mancante' });

  try {
    // Step 1: cerca stazione origine e timestamp
    const searchRes = await fetch(
      `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/cercaNumeroTrenoTrenoAutocomplete/${numero}`
    );
    const searchText = await searchRes.text();
    if (!searchText.trim()) return res.status(404).json({ error: 'Treno non trovato' });

    const firstLine = searchText.trim().split('\n')[0];
    const parts = firstLine.split('|')[1]?.split('-');
    if (!parts || parts.length < 3) return res.status(404).json({ error: 'Dati non disponibili' });

    const codOrigine = parts[1];
    const timestamp = parts[2];

    // Step 2: andamento treno
    const andamentoRes = await fetch(
      `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/andamentoTreno/${codOrigine}/${numero}/${timestamp}`
    );
    if (andamentoRes.status === 204) return res.status(404).json({ error: 'Dati non ancora disponibili' });
    
    const data = await andamentoRes.json();

    res.json({
      ritardo: data.ritardo ?? 0,
      stazioneUltima: data.stazioneUltimoRilevamento ?? '--',
      oraUltima: data.oraUltimoRilevamento ?? null,
      binario: data.binarioProgrammatoPartenzaDescrizione ?? null,
      cancellato: data.provvedimento === 1,
      inStazione: data.inStazione ?? false
    });

  } catch (e) {
    res.status(500).json({ error: 'Errore server' });
  }
}
