from django.apps import AppConfig


class CompaniesConfig(AppConfig):
    name = 'companies'

    def ready(self):
        from companies.trash import install
        install()
