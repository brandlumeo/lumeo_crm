import sys

filepath = 'frontend/src/app/(app)/calendar/page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="input-field bg-white"', 'className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors bg-white"')
content = content.replace('className="input-field bg-white text-sm"', 'className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors bg-white"')

content = content.replace('Event Title *</label>', 'Event Title <span className="text-red-500">*</span></label>')
content = content.replace('Start Date *</label>', 'Start Date <span className="text-red-500">*</span></label>')
content = content.replace('Start Time *</label>', 'Start Time <span className="text-red-500">*</span></label>')
content = content.replace('End Date *</label>', 'End Date <span className="text-red-500">*</span></label>')
content = content.replace('End Time *</label>', 'End Time <span className="text-red-500">*</span></label>')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
