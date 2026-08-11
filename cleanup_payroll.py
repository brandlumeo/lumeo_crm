import re

with open('frontend/src/app/(app)/payroll/[id]/print/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove specific residual invoice lines
code = re.sub(r'\{invoice\.due_date &&.*?\}', '', code)
code = re.sub(r'\{invoiceSettings\?\.show_status_on_invoice.*?\}', '', code, flags=re.DOTALL)
code = re.sub(r'\{invoiceSettings\?\.show_status_on_invoice.*?</div>\s*\)\}', '', code, flags=re.DOTALL) # match full blocks
code = re.sub(r'\{invoice\.status.*?\}', '', code) # fallback

# Remove signature and payment sections
# Find the start of the signature block, which usually has a title 'Signature' or similar
footer_start = code.find('<div className="mt-12 pt-8 print:mt-2')
if footer_start != -1:
    code = code[:footer_start] + '''<div className="mt-12 pt-8 print:mt-2 print:pt-2 border-t-2 border-line text-center flex flex-col items-center clear-both w-full" style={{ pageBreakBefore: 'auto' }}>
              <p className="text-muted text-sm">This is a computer-generated document and does not require a physical signature.</p>
              <p className="text-muted text-xs mt-2">Generated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'''
with open('frontend/src/app/(app)/payroll/[id]/print/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
