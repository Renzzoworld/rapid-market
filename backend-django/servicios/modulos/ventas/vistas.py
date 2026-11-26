from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import anular_venta, editar_venta, listar_ventas, registrar_venta
from .repositorio import get_sale
from ...compartido.serializers import VentaSerializer


class EditarVentaSerializer(serializers.Serializer):
    sale_type_id = serializers.IntegerField(min_value=1)
    payment_method_id = serializers.IntegerField(min_value=1)


class SalesView(APIView):
    def get(self, request):
        return Response(listar_ventas(request.user, request.query_params))

    def post(self, request):
        serializador = VentaSerializer(data=request.data)
        serializador.is_valid(raise_exception=True)
        result = registrar_venta(request.user, serializador.validated_data)
        return Response(result, status=status.HTTP_201_CREATED)

    def patch(self, request, sale_id=None):
        serializer = EditarVentaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = editar_venta(request.user, sale_id, serializer.validated_data)
        if result is None:
            return Response({"detail": "Venta no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result)

    def delete(self, request, sale_id=None):
        result = anular_venta(request.user, sale_id)
        if result is None:
            return Response({"detail": "Venta no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result)


class SaleReceiptPDFView(APIView):
    def get(self, request, sale_id, receipt_type):
        if receipt_type not in {"boleta", "factura"}:
            return Response({"detail": "Tipo de comprobante inválido."}, status=status.HTTP_400_BAD_REQUEST)
        sale = get_sale(sale_id, user_id=None if request.user.groups.filter(name__in=["Administrador", "admin"]).exists() or request.user.is_superuser else request.user.id)
        if not sale:
            return Response({"detail": "Venta no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        receipt_name = "Boleta" if receipt_type == "boleta" else "Factura"
        prefix = "B001" if receipt_type == "boleta" else "F001"
        receipt_number = f"{prefix}-{sale_id:08d}"
        buffer = BytesIO()
        page_width, _ = A4
        document = SimpleDocTemplate(
            buffer, pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
            topMargin=30 * mm, bottomMargin=22 * mm,
            title=f"{receipt_name} {receipt_number} - Rapid Market",
            author="Rapid Market",
        )
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name="ReceiptTitle", parent=styles["Title"], fontName="Helvetica-Bold",
            fontSize=19, leading=23, textColor=colors.HexColor("#123a2a"),
            alignment=TA_LEFT, spaceAfter=4 * mm,
        ))
        styles.add(ParagraphStyle(
            name="ReceiptSub", parent=styles["Normal"], fontSize=9,
            leading=13, textColor=colors.HexColor("#5b6870"),
        ))
        styles.add(ParagraphStyle(
            name="ReceiptNotice", parent=styles["Normal"], fontName="Helvetica-Bold",
            fontSize=8.5, leading=12, textColor=colors.HexColor("#7c2d12"),
        ))
        styles.add(ParagraphStyle(
            name="ReceiptCell", parent=styles["Normal"], fontSize=8.5, leading=11,
        ))
        styles.add(ParagraphStyle(
            name="ReceiptCellRight", parent=styles["ReceiptCell"], alignment=TA_RIGHT,
        ))
        story = [
            Paragraph(receipt_name.upper(), styles["ReceiptTitle"]),
            Paragraph(f"Comprobante interno {receipt_number}", styles["ReceiptSub"]),
            Spacer(1, 6 * mm),
        ]
        notice = Table([[Paragraph(
            "DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ TRIBUTARIA · "
            "No reemplaza un comprobante electrónico autorizado por SUNAT.",
            styles["ReceiptNotice"],
        )]], colWidths=[page_width - 36 * mm])
        notice.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff7ed")),
            ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#fdba74")),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.extend([notice, Spacer(1, 7 * mm)])
        metadata = [
            ["N° de venta", f"VT-{sale_id}", "Fecha", escape(str(sale["fecha"]))],
            ["Medio de pago", escape(str(sale["payment"])), "Cliente", "Datos no registrados"],
        ]
        metadata_table = Table(metadata, colWidths=[27 * mm, 54 * mm, 22 * mm, 58 * mm])
        metadata_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f3")),
            ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f1f5f3")),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#52615b")),
            ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#52615b")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dbe3df")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.extend([metadata_table, Spacer(1, 9 * mm)])

        cell_style = styles["ReceiptCell"]
        cell_right = styles["ReceiptCellRight"]
        item_rows = [["Producto", "Cantidad", "Precio unitario", "Importe"]]
        for item in sale["items"]:
            quantity = Decimal(str(item["quantity"]))
            unit_price = Decimal(str(item["price"]))
            line_total = (quantity * unit_price).quantize(Decimal("0.01"))
            item_rows.append([
                Paragraph(escape(str(item["name"])), cell_style),
                Paragraph(escape(format(quantity.normalize(), "f")), cell_right),
                Paragraph(f"S/ {unit_price:.2f}", cell_right),
                Paragraph(f"S/ {line_total:.2f}", cell_right),
            ])
        items_table = Table(item_rows, colWidths=[79 * mm, 22 * mm, 34 * mm, 26 * mm], repeatRows=1)
        items_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#174d38")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.5),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7faf8")]),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, colors.HexColor("#123a2a")),
            ("LINEBELOW", (0, 1), (-1, -1), 0.35, colors.HexColor("#e5ebe7")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.extend([items_table, Spacer(1, 5 * mm)])
        total = Decimal(str(sale["total"]))
        totals = Table([["TOTAL", f"S/ {total:.2f}"]], colWidths=[125 * mm, 36 * mm])
        totals.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#e9f4ee")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#123a2a")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 12),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 11),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
        ]))
        story.extend([totals, Spacer(1, 7 * mm), Paragraph(
            "Gracias por su compra.", styles["ReceiptSub"]
        )])

        def draw_page(canvas, doc):
            canvas.saveState()
            canvas.setFillColor(colors.HexColor("#123a2a"))
            canvas.rect(0, A4[1] - 20 * mm, A4[0], 20 * mm, fill=1, stroke=0)
            canvas.setFillColor(colors.white)
            canvas.setFont("Helvetica-Bold", 14)
            canvas.drawString(18 * mm, A4[1] - 12.5 * mm, "RAPID MARKET")
            canvas.setFont("Helvetica", 8)
            canvas.drawRightString(A4[0] - 18 * mm, A4[1] - 12 * mm, receipt_number)
            canvas.setStrokeColor(colors.HexColor("#dbe3df"))
            canvas.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
            canvas.setFillColor(colors.HexColor("#64716b"))
            canvas.setFont("Helvetica", 7.5)
            canvas.drawString(18 * mm, 10 * mm, "Formato interno para registro y revisión de ventas")
            canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Página {doc.page}")
            canvas.restoreState()

        document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{receipt_type}_{receipt_number}.pdf"'
        return response
