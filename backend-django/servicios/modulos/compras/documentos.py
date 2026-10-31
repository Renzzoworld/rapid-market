from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table,
    TableStyle,
)


AZUL = colors.HexColor("#17324D")
AZUL_CLARO = colors.HexColor("#EAF1F7")
GRIS = colors.HexColor("#526171")
BORDE = colors.HexColor("#D5DEE8")
TEXTO = colors.HexColor("#1F2937")


def _fecha(value):
    if not value:
        return "-"
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    try:
        return date.fromisoformat(str(value)[:10]).strftime("%d/%m/%Y")
    except ValueError:
        return str(value)


def _dinero(value):
    amount = Decimal(str(value or 0))
    return f"S/ {amount:,.2f}"


def _p(text, style):
    return Paragraph(escape(str(text or "")), style)


def generar_pdf_orden_compra(compra):
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=16 * mm, leftMargin=16 * mm,
        topMargin=15 * mm, bottomMargin=17 * mm,
        title=f"Orden de compra OC-{int(compra['id']):06d}",
        author=compra.get("responsible_name") or "Rapid Market",
        subject="Orden de compra",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="Brand", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=16, leading=19, textColor=colors.white, spaceAfter=3))
    styles.add(ParagraphStyle(name="DocTitle", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=14, leading=17, textColor=colors.white, alignment=TA_RIGHT, spaceAfter=3))
    styles.add(ParagraphStyle(name="DocCode", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=12, textColor=colors.white, alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name="Section", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=AZUL, spaceBefore=9, spaceAfter=5))
    styles.add(ParagraphStyle(name="CardTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=AZUL, spaceAfter=4))
    styles.add(ParagraphStyle(name="BodySmall", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=TEXTO, wordWrap="CJK"))
    styles.add(ParagraphStyle(name="BodySmallRight", parent=styles["BodySmall"], alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name="TableHead", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white))
    styles.add(ParagraphStyle(name="TableHeadRight", parent=styles["TableHead"], alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name="TableCell", parent=styles["BodySmall"], fontSize=8, leading=10))
    styles.add(ParagraphStyle(name="TableCellRight", parent=styles["TableCell"], alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name="Sign", parent=styles["BodySmall"], alignment=TA_CENTER))

    company = compra.get("company") or {}
    lines = compra.get("items") or []
    order_code = f"OC-{int(compra['id']):06d}"
    story = []

    masthead = Table([
        [_p(company.get("nombre_comercial") or "Rapid Market", styles["Brand"]),
         [_p("ORDEN DE COMPRA", styles["DocTitle"]), _p(order_code, styles["DocCode"])]],
    ], colWidths=[95 * mm, 83 * mm])
    masthead.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), AZUL),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story.extend([masthead, Spacer(1, 5 * mm)])

    def card(title, pairs):
        content = [_p(title, styles["CardTitle"])]
        field_rows = []
        for index in range(0, len(pairs), 2):
            row = []
            for label, value in pairs[index:index + 2]:
                row.append(Paragraph(f"<b>{escape(label)}</b><br/>{escape(str(value or '-'))}", styles["BodySmall"]))
            if len(row) == 1:
                row.append("")
            field_rows.append(row)
        fields_table = Table(field_rows, colWidths=[38 * mm, 38 * mm])
        fields_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        content.append(fields_table)
        table = Table([[content]], colWidths=[87 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.7, BORDE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        return table

    company_card = card("02. RAPID MARKET", [
        ("Razón social", company.get("razon_social")),
        ("RUC", company.get("ruc")),
        ("Correo", company.get("correo_electronico")),
        ("Teléfono", company.get("telefono")),
    ])
    supplier_items = [
        ("Razón social", compra.get("provider_legal_name")),
        ("RUC", compra.get("provider_ruc")),
        ("Correo", compra.get("provider_email")),
        ("Teléfono", compra.get("provider_phone")),
    ]
    if compra.get("contact_name"):
        supplier_items.extend([
            ("Contacto", compra.get("contact_name")),
            ("Cargo", compra.get("contact_role")),
        ])
        if compra.get("contact_phone"):
            supplier_items.append(("Teléfono del contacto", compra["contact_phone"]))
        if compra.get("contact_email"):
            supplier_items.append(("Correo del contacto", compra["contact_email"]))
    company_supplier = Table([[company_card, card("03. PROVEEDOR", supplier_items)]], colWidths=[89 * mm, 89 * mm])
    company_supplier.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 3)]))
    story.append(company_supplier)

    story.append(_p("04. Términos y condiciones", styles["Section"]))
    terms = [
        [Paragraph("<b>Fecha de emisión</b>", styles["BodySmall"]), Paragraph("<b>Entrega requerida</b>", styles["BodySmall"])],
        [_p(_fecha(compra.get("fecha")), styles["BodySmall"]), _p(_fecha(compra.get("requested_delivery_date")), styles["BodySmall"])],
        [Paragraph("<b>Lugar de entrega</b>", styles["BodySmall"]), ""],
        [_p(compra.get("delivery_address") or "-", styles["BodySmall"]), ""],
    ]
    terms_table = Table(terms, colWidths=[89 * mm, 89 * mm])
    terms_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 1), AZUL_CLARO),
        ("SPAN", (0, 2), (1, 2)), ("SPAN", (0, 3), (1, 3)),
        ("BOX", (0, 0), (-1, -1), 0.7, BORDE),
        ("INNERGRID", (0, 0), (-1, 1), 0.4, BORDE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(terms_table)

    story.append(_p("05. Productos solicitados", styles["Section"]))
    item_rows = [[
        _p("N°", styles["TableHead"]), _p("Producto", styles["TableHead"]),
        _p("Cantidad", styles["TableHeadRight"]), _p("Precio unitario", styles["TableHeadRight"]),
        _p("Importe", styles["TableHeadRight"]),
    ]]
    for index, item in enumerate(lines, start=1):
        item_rows.append([
            _p(f"{index:02d}", styles["TableCell"]),
            _p(item.get("name") or "", styles["TableCell"]),
            _p(f"{Decimal(str(item.get('quantity') or 0)):,.3f}", styles["TableCellRight"]),
            _p(_dinero(item.get("unit_price")), styles["TableCellRight"]),
            _p(_dinero(item.get("amount")), styles["TableCellRight"]),
        ])
    items_table = Table(item_rows, colWidths=[12 * mm, 77 * mm, 25 * mm, 32 * mm, 32 * mm], repeatRows=1, hAlign="LEFT")
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), AZUL),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F9FC")]),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([items_table, Spacer(1, 2 * mm)])
    igv_rate = compra.get("igv_rate")
    igv_label = f"IGV ({Decimal(str(igv_rate)):g}%)" if igv_rate is not None else "IGV (no registrado)"
    totals = [
        ["Subtotal", _dinero(compra.get("subtotal"))],
        [igv_label, _dinero(compra.get("igv_amount"))],
        ["TOTAL", _dinero(compra.get("total"))],
    ]
    totals_table = Table([
        [_p(label, styles["BodySmallRight"]), _p(value, styles["BodySmallRight"])]
        for label, value in totals
    ], colWidths=[35 * mm, 35 * mm], hAlign="RIGHT")
    totals_table.setStyle(TableStyle([
        ("LINEABOVE", (0, 2), (-1, 2), 1, AZUL),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 2), (-1, 2), AZUL),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(totals_table)

    story.append(_p("06. Observaciones", styles["Section"]))
    observations = compra.get("observations") or ""
    observation_box = Table([[_p(observations, styles["BodySmall"])]], colWidths=[178 * mm])
    observation_box.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.7, BORDE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([observation_box, Spacer(1, 15 * mm)])
    signer = Table([
        [HRFlowable(width="75%", thickness=0.7, color=GRIS), HRFlowable(width="75%", thickness=0.7, color=GRIS)],
        [_p(compra.get("responsible_name") or "", styles["Sign"]), _p(compra.get("responsible_role") or "", styles["Sign"])],
        [_p("Emitido por", styles["Sign"]), _p("Cargo / rol", styles["Sign"])],
    ], colWidths=[89 * mm, 89 * mm])
    signer.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.extend([KeepTogether([signer])])

    def draw_page(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(BORDE)
        canvas.line(16 * mm, 12 * mm, A4[0] - 16 * mm, 12 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(GRIS)
        canvas.drawString(16 * mm, 7.5 * mm, "Rapid Market | Orden de compra")
        canvas.drawRightString(A4[0] - 16 * mm, 7.5 * mm, f"Página {doc.page}")
        canvas.restoreState()

    document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    return buffer.getvalue()
