from django.views.generic import TemplateView


class APIIndexView(TemplateView):
    template_name = "servicios/api_index.html"
