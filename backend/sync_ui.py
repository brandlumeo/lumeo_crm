import re
import sys

def main():
    try:
        with open('frontend/src/app/public/invoice/[token]/page.tsx', 'r', encoding='utf-8') as f:
            invoice_content = f.read()

        with open('frontend/src/app/public/quote/[token]/page.tsx', 'r', encoding='utf-8') as f:
            quote_content = f.read()
            
        m_inv = re.search(r'(    <>\s*<style dangerouslySetInnerHTML=\{{ __html: `.*?)(?=\s*\{\/\* Payment Section \*\/\})', invoice_content, re.DOTALL)
        if not m_inv:
            print("Could not find invoice UI block")
            return
            
        inv_ui = m_inv.group(1)
        
        # Replace variable names in inv_ui
        q_ui = inv_ui.replace('invoice-container', 'quote-container')
        q_ui = q_ui.replace('invoice.invoice_number', 'quote.quote_number')
        q_ui = q_ui.replace('invoice.issue_date', 'quote.created_at.split("T")[0]') 
        q_ui = q_ui.replace('invoice.due_date', 'quote.valid_until') 
        q_ui = q_ui.replace('invoice.', 'quote.')
        q_ui = q_ui.replace('InvoiceLineItem', 'any')
        q_ui = q_ui.replace('INVOICE DOCUMENT', 'QUOTE DOCUMENT')
        q_ui = q_ui.replace('INVOICE', 'QUOTE')
        q_ui = q_ui.replace('Invoice', 'Quote')
        q_ui = q_ui.replace('invoice,', 'quote,')
        q_ui = q_ui.replace('invoice)', 'quote)')
        q_ui = q_ui.replace('Quote Acknowledged', 'Quote Accepted')
        q_ui = q_ui.replace('acknowledge receipt of this quote.', 'acknowledge and accept this quote.')
        q_ui = q_ui.replace('quote.settings?', 'settings?')
        q_ui = q_ui.replace('quote.settings.', 'settings.')
        
        # Find the MAIN return block in quote_content. We can find it by looking for `return (` followed by `<>`.
        m_quote_return = re.search(r'(  return \(\s*)(<>\s*<style dangerouslySetInnerHTML.*?)(?=\s*<\/div>\s*<\/div>\s*<\/>\s*\);\s*\})', quote_content, re.DOTALL)
        if not m_quote_return:
            print("Could not find main quote return block")
            return
            
        new_quote_content = quote_content[:m_quote_return.start(2)] + q_ui + "\n      </div>\n    </div>\n    </>\n  );\n}"
        
        with open('frontend/src/app/public/quote/[token]/page.tsx', 'w', encoding='utf-8') as f:
            f.write(new_quote_content)
        
        print("Successfully updated quote UI!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
