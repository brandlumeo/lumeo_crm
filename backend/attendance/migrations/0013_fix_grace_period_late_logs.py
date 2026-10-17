import datetime
from django.db import migrations
from django.utils import timezone

def fix_late_timelogs(apps, schema_editor):
    TimeLog = apps.get_model('attendance', 'TimeLog')
    Company = apps.get_model('companies', 'Company')
    
    for company in Company.objects.all():
        if not company.office_start_time:
            continue
            
        import zoneinfo
        try:
            company_tz = zoneinfo.ZoneInfo(company.timezone or 'UTC')
        except Exception:
            company_tz = datetime.timezone.utc

        grace_mins = company.late_mark_after_minutes or 0
        
        late_logs = TimeLog.objects.filter(company=company, shift_status='late')
        for log in late_logs:
            if not log.clock_in:
                continue
            log_local = log.clock_in.astimezone(company_tz) if timezone.is_aware(log.clock_in) else log.clock_in
            shift_start = datetime.datetime.combine(log_local.date(), company.office_start_time)
            if timezone.is_naive(shift_start):
                shift_start = timezone.make_aware(shift_start, company_tz)
            
            cutoff = shift_start + datetime.timedelta(minutes=grace_mins, seconds=59, microseconds=999999)
            if log_local <= cutoff:
                log.shift_status = 'on_time'
                log.save(update_fields=['shift_status'])

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('attendance', '0012_leaverequest_pay_status_and_more'),
    ]
    operations = [
        migrations.RunPython(fix_late_timelogs, reverse_func),
    ]
