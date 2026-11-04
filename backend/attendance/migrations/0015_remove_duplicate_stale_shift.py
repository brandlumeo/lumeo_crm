import datetime
from django.db import migrations
from django.utils import timezone

def remove_duplicate_shift(apps, schema_editor):
    TimeLog = apps.get_model('attendance', 'TimeLog')
    Company = apps.get_model('companies', 'Company')
    
    # 1. Deduplicate multiple shifts on the same date for the same user
    for company in Company.objects.all():
        import zoneinfo
        try:
            company_tz = zoneinfo.ZoneInfo(company.timezone or 'UTC')
        except Exception:
            company_tz = datetime.timezone.utc

        all_logs = TimeLog.objects.filter(company=company)
        
        from collections import defaultdict
        user_date_logs = defaultdict(list)
        for log in all_logs:
            if not log.clock_in:
                continue
            log_local = log.clock_in.astimezone(company_tz) if timezone.is_aware(log.clock_in) else log.clock_in
            key = (log.user_id, log_local.date())
            user_date_logs[key].append(log)

        for (user_id, log_date), entries in user_date_logs.items():
            if len(entries) > 1:
                # If there are multiple shifts for this user on this day (e.g. Nov 3):
                # An anomalous shift has duration > 16 hours or is_auto_closed = True
                anomalous = [
                    l for l in entries 
                    if l.clock_out and (
                        (l.clock_out - l.clock_in).total_seconds() > 16 * 3600
                        or getattr(l, 'is_auto_closed', False)
                    )
                ]
                normal = [l for l in entries if l not in anomalous]
                
                # If both a normal shift and an anomalous duplicate exist, delete the anomalous one
                if normal and anomalous:
                    for a_log in anomalous:
                        a_log.delete()

    # 2. Fix standalone shifts that suffered from the stale auto-close overnight bug (duration > 18h)
    # Cap their clock_out to 18:00 (6:00 PM) on that same date
    for log in TimeLog.objects.all():
        if log.clock_in and log.clock_out:
            diff_hours = (log.clock_out - log.clock_in).total_seconds() / 3600.0
            if diff_hours > 18:
                company = getattr(log, 'company', None)
                import zoneinfo
                try:
                    c_tz = zoneinfo.ZoneInfo(company.timezone if company and company.timezone else 'UTC')
                except Exception:
                    c_tz = datetime.timezone.utc
                log_local = log.clock_in.astimezone(c_tz) if timezone.is_aware(log.clock_in) else log.clock_in
                clean_out = datetime.datetime.combine(log_local.date(), datetime.time(18, 0, 0))
                clean_out_aware = timezone.make_aware(clean_out, c_tz)
                log.clock_out = clean_out_aware
                log.save(update_fields=['clock_out'])

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('attendance', '0014_monthlyperformancereport'),
    ]
    operations = [
        migrations.RunPython(remove_duplicate_shift, reverse_func),
    ]
