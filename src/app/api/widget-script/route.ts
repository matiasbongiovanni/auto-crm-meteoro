import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const BASE_URL = "https://auto-crm-hazel.vercel.app";
  const script = `var BASE_URL = "${BASE_URL}";
var API_KEY = args.widgetParameter || "";
var C = {
  bg: new Color("#0a0a0a"), card: new Color("#111111"),
  primary: new Color("#fafafa"), muted: new Color("#555555"),
  success: new Color("#22c55e"), warning: new Color("#f59e0b"),
  danger: new Color("#ef4444"), accent: new Color("#a3a3a3"),
  border: new Color("#1f1f1f")
};
async function fetchMetrics() {
  var req = new Request(BASE_URL + "/api/widget");
  req.headers = {"Authorization": "Bearer " + API_KEY};
  req.timeoutInterval = 10;
  try { return await req.loadJSON(); } catch(e) { return null; }
}
async function fetchLogo() {
  try {
    var req = new Request(BASE_URL + "/brand/meteoro-negativo.png");
    return await req.loadImage();
  } catch(e) { return null; }
}
function fmtUsd(n) {
  if (!n && n !== 0) return "--";
  if (n >= 1000) return "$" + (n/1000).toFixed(1) + "k";
  return "$" + Math.round(n);
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
}
function metric(parent, label, value, sub, color) {
  var col = parent.addStack();
  col.layoutVertically();
  col.size = new Size(0, 0);
  var l = col.addText(label.toUpperCase());
  l.textColor = C.muted; l.font = Font.semiboldSystemFont(7);
  l.minimumScaleFactor = 0.8;
  col.addSpacer(3);
  var v = col.addText(value);
  v.textColor = color || C.primary; v.font = Font.boldSystemFont(17);
  v.minimumScaleFactor = 0.5;
  col.addSpacer(2);
  var s = col.addText(sub);
  s.textColor = C.muted; s.font = Font.systemFont(8);
  s.minimumScaleFactor = 0.8;
}
async function buildWidget(data, logo) {
  var w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(12, 14, 10, 14);
  w.refreshAfterDate = new Date(Date.now() + 15*60*1000);
  if (!data || !data.ok) {
    var e = w.addText(!API_KEY ? "Configurá API Key en widget parameter" : "Sin datos");
    e.textColor = C.warning; e.font = Font.mediumSystemFont(12);
    return w;
  }
  var m = data.metrics;
  var mn = new Date(data.month+"-15").toLocaleString("es-AR",{month:"short"}).toUpperCase();
  var yr = data.month.split("-")[0];
  var hdr = w.addStack();
  hdr.layoutHorizontally(); hdr.centerAlignContent();
  if (logo) {
    var img = hdr.addImage(logo);
    img.imageSize = new Size(90, 22);
    img.resizable = true;
    img.imageOpacity = 0.9;
  } else {
    var lt = hdr.addText("METEORO");
    lt.textColor = C.primary; lt.font = Font.boldSystemFont(13);
  }
  hdr.addSpacer();
  var datePill = hdr.addStack();
  datePill.backgroundColor = C.card;
  datePill.cornerRadius = 5;
  datePill.setPadding(3,7,3,7);
  var dp = datePill.addText(mn + " " + yr);
  dp.textColor = C.muted; dp.font = Font.semiboldSystemFont(8);
  w.addSpacer(10);
  var row = w.addStack();
  row.layoutHorizontally(); row.spacing = 0;
  var top = [
    {label:"Cobrado mes", value:fmtUsd(m.cobradoMes), sub:"ingresos", color:C.success},
    {label:"Neto mes", value:fmtUsd(m.netoMes), sub:"ing-egr", color:m.netoMes>=0?C.success:C.danger},
    {label:"Ticket prom.", value:fmtUsd(m.ticketPromedio), sub:"por cliente", color:C.accent}
  ];
  for (var i=0;i<top.length;i++) {
    metric(row, top[i].label, top[i].value, top[i].sub, top[i].color);
    if (i < top.length-1) {
      row.addSpacer();
      var div = row.addStack();
      div.backgroundColor = C.border;
      div.size = new Size(1, 36);
      row.addSpacer();
    }
  }
  w.addSpacer(7);
  var row2 = w.addStack(); row2.layoutHorizontally(); row2.spacing = 0;
  var bot = [
    {label:"Presup. total", value:fmtUsd(m.presupuestadoTotal), sub:m.cantPresupuestosTotal+" docs", color:C.accent},
    {label:"Pendiente total", value:fmtUsd(m.pendientesTotal), sub:m.cantPendientesMes+" este mes", color:m.pendientesTotal>0?C.warning:C.success}
  ];
  for (var j=0;j<bot.length;j++) {
    metric(row2, bot[j].label, bot[j].value, bot[j].sub, bot[j].color);
    if (j < bot.length-1) {
      row2.addSpacer();
      var div2 = row2.addStack();
      div2.backgroundColor = C.border;
      div2.size = new Size(1, 36);
      row2.addSpacer();
    }
  }
  w.addSpacer(8);
  var footer = w.addStack();
  footer.layoutHorizontally(); footer.centerAlignContent();
  if (data.presupuestosByEstado) {
    var est = [
      {key:"enviado",label:"env",color:C.accent},
      {key:"en_negociacion",label:"neg",color:C.warning},
      {key:"aceptado",label:"ok",color:C.success},
      {key:"rechazado",label:"rej",color:C.danger}
    ];
    for (var j=0;j<est.length;j++) {
      var cnt = data.presupuestosByEstado[est[j].key]||0;
      var chip = footer.addStack();
      chip.backgroundColor = C.card; chip.cornerRadius = 4; chip.setPadding(2,5,2,5);
      var ct = chip.addText(est[j].label+" "+cnt);
      ct.textColor = est[j].color; ct.font = Font.semiboldSystemFont(8);
      if (j < est.length-1) footer.addSpacer(4);
    }
  }
  footer.addSpacer();
  var ts = footer.addText("act. "+fmtTime(data.updatedAt));
  ts.textColor = C.muted; ts.font = Font.systemFont(7);
  return w;
}
var results = await Promise.all([fetchMetrics(), fetchLogo()]);
var widget = await buildWidget(results[0], results[1]);
if (config.runInWidget) { Script.setWidget(widget); } else { widget.presentMedium(); }
Script.complete();`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meteoro-widget.js"',
    },
  });
}
