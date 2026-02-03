import { createChart } from 'https://unpkg.com/lightweight-charts@3.6.0/dist/lightweight-charts.esm.production.js';

export function createStockChart({ chartContainerId='stock-chart', volumeContainerId='stock-volume' } = {}) {
  const chartContainer = document.getElementById(chartContainerId);
  const volumeContainer = document.getElementById(volumeContainerId);
  chartContainer.innerHTML = ''; volumeContainer.innerHTML = '';

  const chart = createChart(chartContainer, {
    layout: { backgroundColor: '#071521', textColor: '#e6eef8' },
    rightPriceScale: { visible: true },
    timeScale: { timeVisible: true, secondsVisible: false },
    grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } }
  });
  const candleSeries = chart.addCandlestickSeries({
    upColor: '#26a69a', borderUpColor: '#26a69a', wickUpColor: '#26a69a',
    downColor: '#ef5350', borderDownColor: '#ef5350', wickDownColor: '#ef5350'
  });
  const maSeries = chart.addLineSeries({ color: '#f0b90b', lineWidth: 2 });

  const volChart = createChart(volumeContainer, {
    layout: { backgroundColor: '#071521', textColor: '#e6eef8' },
    rightPriceScale: { visible: false },
    timeScale: { timeVisible: true, secondsVisible: false },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    height: 120
  });
  const volSeries = volChart.addHistogramSeries({
    color: '#4b6b8a', priceFormat: { type: 'volume' }, priceScaleId: '', scaleMargins: { top: 0.8, bottom: 0 }
  });

  chart.timeScale().subscribeVisibleTimeRangeChange(range=>{
    try{ volChart.timeScale().setVisibleRange(range); }catch(e){}
  });
  volChart.timeScale().subscribeVisibleTimeRangeChange(range=>{
    try{ chart.timeScale().setVisibleRange(range); }catch(e){}
  });

  function historyToSeries(history){
    const candleData = history.map(h => ({ time: Math.floor(h.time/1000), open: Number(h.open), high: Number(h.high), low: Number(h.low), close: Number(h.close) }));
    const volData = history.map(h => ({ time: Math.floor(h.time/1000), value: Number(h.volume), color: (h.close >= h.open) ? 'rgba(38,166,154,0.8)' : 'rgba(239,83,80,0.8)' }));
    return { candleData, volData };
  }

  function calcMA(history, period=10){
    const closes = history.map(h=>Number(h.close));
    const arr = [];
    for(let i=0;i<closes.length;i++){
      if(i+1 < period) continue;
      const slice = closes.slice(i+1-period, i+1);
      const avg = slice.reduce((a,b)=>a+b,0)/period;
      arr.push({ time: Math.floor(history[i].time/1000), value: avg });
    }
    return arr;
  }

  return {
    setData(history){
      const { candleData, volData } = historyToSeries(history);
      candleSeries.setData(candleData);
      volSeries.setData(volData);
      maSeries.setData(calcMA(history, 10));
    },
    updatePoint(point){
      const t = Math.floor(point.time/1000);
      candleSeries.update({ time: t, open: point.open, high: point.high, low: point.low, close: point.close });
      volSeries.update({ time: t, value: point.volume, color: (point.close>=point.open? 'rgba(38,166,154,0.8)':'rgba(239,83,80,0.8)') });
    }
  };
}
