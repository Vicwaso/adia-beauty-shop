from rest_framework import generics
from django.db.models import Prefetch

from .models import Category, Product, ProductImage
from .serializers import CategorySerializer, ProductListSerializer, ProductDetailSerializer


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductListView(generics.ListAPIView):
    """
    Public, read-only catalog listing.
    Out-of-stock products are NOT hidden — the storefront shows them with a
    disabled 'Add to Cart' per the plan doc. Only inactive products are excluded.
    Supports ?category=<slug> and ?search=<q>.
    """
    serializer_class = ProductListSerializer

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).prefetch_related(
            Prefetch("images", queryset=ProductImage.objects.order_by("order"))
        )
        category_slug = self.request.query_params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductDetailSerializer
    lookup_field = "slug"
