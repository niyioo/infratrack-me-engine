from rest_framework.pagination import PageNumberPagination


class OptionalPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class OptionalPaginationMixin:
    """
    Preserves current list contracts unless callers opt into pagination by
    sending `page` or `page_size`.
    """

    pagination_class = OptionalPageNumberPagination

    def paginate_queryset(self, queryset):
        request = getattr(self, "request", None)
        if request is None:
            return None

        if "page" not in request.query_params and "page_size" not in request.query_params:
            return None

        return super().paginate_queryset(queryset)
