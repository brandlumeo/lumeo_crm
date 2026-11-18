# Generated data migration to seed BrandLumeo Growth Package quote template

from django.db import migrations


def seed_brandlumeo_template(apps, schema_editor):
    Company = apps.get_model('companies', 'Company')
    QuoteTemplate = apps.get_model('crm', 'QuoteTemplate')

    company = Company.objects.filter(slug='northwind-trading').first()
    if not company:
        company = Company.objects.filter(name__icontains='Brandlumeo').first()

    if not company:
        return

    if not QuoteTemplate.objects.filter(company=company, name='Growth Package').exists():
        QuoteTemplate.objects.create(
            company=company,
            name='Growth Package',
            title='Growth Package',
            duration='1 Month',
            overview='This quotation covers our Growth Package for client — a one-month digital marketing programme to build brand visibility and generate student enquiries through video content, social media management, Google Business Profile optimisation and Meta advertising.',
            items=[
                {
                    'item_number': '1',
                    'name': 'Growth Package',
                    'description': 'Comprehensive 1-month digital marketing & lead generation retainer',
                    'quantity': 1,
                    'unit_price': 15999,
                    'tax_rate': 0,
                    'unit': 'Month',
                    'is_included': False,
                },
                {
                    'item_number': '1.1',
                    'name': 'Promotional Videos',
                    'description': 'Concept, scripting, shooting and editing of short-form videos for Reels, Shorts and feeds',
                    'quantity': 4,
                    'unit_price': 0,
                    'tax_rate': 0,
                    'unit': '',
                    'is_included': True,
                },
                {
                    'item_number': '1.2',
                    'name': 'Trending Video',
                    'description': 'Trend-based creative video using current formats to maximise reach',
                    'quantity': 1,
                    'unit_price': 0,
                    'tax_rate': 0,
                    'unit': '',
                    'is_included': True,
                },
                {
                    'item_number': '1.3',
                    'name': 'Social Media Management',
                    'description': 'Content calendar, post design, captions, scheduling and page management (Instagram & Facebook)',
                    'quantity': 1,
                    'unit_price': 0,
                    'tax_rate': 0,
                    'unit': 'Month',
                    'is_included': True,
                },
                {
                    'item_number': '1.4',
                    'name': 'Google Business Profile Optimisation',
                    'description': 'Profile setup and audit, categories, keywords, photos, services and review strategy',
                    'quantity': 1,
                    'unit_price': 0,
                    'tax_rate': 0,
                    'unit': '',
                    'is_included': True,
                },
                {
                    'item_number': '1.5',
                    'name': 'Meta Ads Management',
                    'description': 'Campaign strategy, targeting, ad creatives, setup, monitoring and optimisation',
                    'quantity': 1,
                    'unit_price': 0,
                    'tax_rate': 0,
                    'unit': 'Month',
                    'is_included': True,
                },
            ],
            payment_schedule=[
                {
                    'milestone': '50% Advance — on confirmation, to commence the project',
                    'amount': 8000,
                },
                {
                    'milestone': '50% Balance — on completion of the monthly scope',
                    'amount': 7999,
                },
            ],
            timeline=[
                {
                    'phase': 'Week 1',
                    'description': 'Onboarding, brand review, content calendar approval, Google Business Profile optimisation, Meta ads setup',
                },
                {
                    'phase': 'Week 2-3',
                    'description': 'Video production and publishing, trending video, regular posting, ad launch and optimisation',
                },
                {
                    'phase': 'Week 4',
                    'description': 'Remaining deliverables, campaign optimisation, performance report and recommendations',
                },
            ],
            client_responsibilities=[
                'Access to Instagram, Facebook, Meta Business Manager and Google Business Profile',
                'Logo, brand assets and course details',
                'Availability of premises and staff for video shoots',
                'Content approvals within 2 working days',
            ],
            exclusions=[
                'Meta ad spend (paid directly by the client to Meta)',
                'Website development, stock assets, influencer fees',
                'Work beyond the stated scope',
            ],
            terms_conditions=[
                'A 50% advance payment is required to commence the project; the balance is payable on completion.',
                'The client must provide all necessary account credentials and materials on time.',
                'Any work beyond the scope of this quotation will be charged additionally.',
                'Each deliverable includes up to two rounds of revisions.',
                'This quotation is valid for 15 days from the date of issue.',
                'Advertising and social media results depend on platform and market factors and are not guaranteed.',
            ],
            is_default=True,
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0065_quotetemplate'),
    ]

    operations = [
        migrations.RunPython(seed_brandlumeo_template, noop),
    ]

