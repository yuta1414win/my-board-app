#!/bin/bash

# DNS Records Update Script for Email Authentication
# This script helps validate and update SPF, DKIM, and DMARC records

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="example.com"  # Change this to your actual domain
EMAIL_PROVIDER="google"  # Options: google, microsoft, custom

echo "================================================"
echo "DNS Email Authentication Setup Script"
echo "================================================"
echo ""

# Function to check DNS records
check_dns_record() {
    local record_type=$1
    local hostname=$2
    local description=$3
    
    echo -e "${YELLOW}Checking $description...${NC}"
    result=$(dig +short TXT "$hostname" 2>/dev/null)
    
    if [ -z "$result" ]; then
        echo -e "${RED}✗ No $description found${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $description found:${NC}"
        echo "  $result"
        return 0
    fi
}

# Function to validate SPF record
validate_spf() {
    echo -e "\n${YELLOW}=== SPF Record Validation ===${NC}"
    
    if check_dns_record "TXT" "$DOMAIN" "SPF record"; then
        spf_record=$(dig +short TXT "$DOMAIN" | grep "v=spf1")
        
        if [[ "$spf_record" == *"-all"* ]] && [[ "$spf_record" != *"include:"* ]] && [[ "$spf_record" != *"ip4:"* ]]; then
            echo -e "${RED}⚠️  WARNING: SPF record blocks all mail (v=spf1 -all)${NC}"
            echo -e "${YELLOW}Recommended SPF records:${NC}"
            echo "  For Gmail: v=spf1 include:_spf.google.com ~all"
            echo "  For Office 365: v=spf1 include:spf.protection.outlook.com ~all"
            echo "  For custom server: v=spf1 ip4:YOUR_IP ~all"
            return 1
        fi
    else
        echo -e "${YELLOW}Recommended SPF record based on your email provider ($EMAIL_PROVIDER):${NC}"
        case $EMAIL_PROVIDER in
            google)
                echo "  v=spf1 include:_spf.google.com ~all"
                ;;
            microsoft)
                echo "  v=spf1 include:spf.protection.outlook.com ~all"
                ;;
            *)
                echo "  v=spf1 ip4:YOUR_SERVER_IP ~all"
                ;;
        esac
        return 1
    fi
}

# Function to validate DKIM record
validate_dkim() {
    echo -e "\n${YELLOW}=== DKIM Record Validation ===${NC}"
    
    # Check common DKIM selectors
    selectors=("default" "google" "k1" "selector1" "selector2")
    dkim_found=false
    
    for selector in "${selectors[@]}"; do
        hostname="${selector}._domainkey.${DOMAIN}"
        result=$(dig +short TXT "$hostname" 2>/dev/null)
        
        if [ ! -z "$result" ]; then
            if [[ "$result" == *"p="* ]] && [[ "$result" != *"p=\"\""* ]] && [[ "$result" != *"p= "* ]]; then
                echo -e "${GREEN}✓ Valid DKIM record found at ${selector}._domainkey${NC}"
                echo "  $result"
                dkim_found=true
                break
            elif [[ "$result" == *"p="* ]]; then
                echo -e "${RED}✗ DKIM record found but public key is empty at ${selector}._domainkey${NC}"
            fi
        fi
    done
    
    if [ "$dkim_found" = false ]; then
        echo -e "${RED}✗ No valid DKIM record found${NC}"
        echo -e "${YELLOW}Action required:${NC}"
        echo "  1. Generate DKIM keys in your email provider's admin panel"
        echo "  2. Add the public key to DNS as a TXT record"
        echo "  3. Common format: selector._domainkey.domain"
        return 1
    fi
}

# Function to validate DMARC record
validate_dmarc() {
    echo -e "\n${YELLOW}=== DMARC Record Validation ===${NC}"
    
    hostname="_dmarc.${DOMAIN}"
    if check_dns_record "TXT" "$hostname" "DMARC record"; then
        dmarc_record=$(dig +short TXT "$hostname")
        
        # Check policy level
        if [[ "$dmarc_record" == *"p=reject"* ]]; then
            echo -e "${YELLOW}⚠️  DMARC is in REJECT mode (strictest)${NC}"
            
            # Check if reporting is configured
            if [[ "$dmarc_record" != *"rua="* ]]; then
                echo -e "${RED}✗ No aggregate reporting (rua) configured${NC}"
            fi
            
            echo -e "${YELLOW}Recommended for initial setup:${NC}"
            echo "  v=DMARC1; p=none; rua=mailto:dmarc@${DOMAIN}; sp=none; adkim=r; aspf=r"
            
        elif [[ "$dmarc_record" == *"p=quarantine"* ]]; then
            echo -e "${YELLOW}ℹ️  DMARC is in QUARANTINE mode${NC}"
        elif [[ "$dmarc_record" == *"p=none"* ]]; then
            echo -e "${GREEN}✓ DMARC is in monitoring mode (safe for initial setup)${NC}"
        fi
    else
        echo -e "${YELLOW}Recommended initial DMARC record:${NC}"
        echo "  v=DMARC1; p=none; rua=mailto:dmarc@${DOMAIN}; sp=none; adkim=r; aspf=r"
        return 1
    fi
}

# Function to generate DNS update commands
generate_update_commands() {
    echo -e "\n${YELLOW}=== DNS Update Commands ===${NC}"
    echo "Add these records to your DNS provider:"
    echo ""
    
    echo "1. SPF Record:"
    echo "   Type: TXT"
    echo "   Host: @ or ${DOMAIN}"
    echo "   Value: v=spf1 include:_spf.google.com ~all"
    echo ""
    
    echo "2. DKIM Record:"
    echo "   Type: TXT"
    echo "   Host: [selector]._domainkey"
    echo "   Value: [Get from your email provider]"
    echo ""
    
    echo "3. DMARC Record (Monitoring Mode):"
    echo "   Type: TXT"
    echo "   Host: _dmarc"
    echo "   Value: v=DMARC1; p=none; rua=mailto:dmarc@${DOMAIN}; sp=none; adkim=r; aspf=r"
}

# Function to test email authentication
test_authentication() {
    echo -e "\n${YELLOW}=== Testing Email Authentication ===${NC}"
    echo "After updating DNS records, test with:"
    echo ""
    echo "1. Send test email to: check-auth@verifier.port25.com"
    echo "2. Use Mail-Tester: https://www.mail-tester.com"
    echo "3. Check with MXToolbox: https://mxtoolbox.com/dmarc.aspx"
    echo ""
    echo "Gmail users: Check email headers for authentication results"
}

# Main execution
main() {
    echo "Checking DNS records for: ${DOMAIN}"
    echo "Email provider: ${EMAIL_PROVIDER}"
    echo ""
    
    # Check current status
    spf_valid=true
    dkim_valid=true
    dmarc_valid=true
    
    validate_spf || spf_valid=false
    validate_dkim || dkim_valid=false
    validate_dmarc || dmarc_valid=false
    
    # Summary
    echo -e "\n${YELLOW}=== Summary ===${NC}"
    
    if [ "$spf_valid" = true ]; then
        echo -e "${GREEN}✓ SPF record is properly configured${NC}"
    else
        echo -e "${RED}✗ SPF record needs attention${NC}"
    fi
    
    if [ "$dkim_valid" = true ]; then
        echo -e "${GREEN}✓ DKIM record is properly configured${NC}"
    else
        echo -e "${RED}✗ DKIM record needs configuration${NC}"
    fi
    
    if [ "$dmarc_valid" = true ]; then
        echo -e "${GREEN}✓ DMARC record is configured${NC}"
    else
        echo -e "${RED}✗ DMARC record needs configuration${NC}"
    fi
    
    # Provide update commands if needed
    if [ "$spf_valid" = false ] || [ "$dkim_valid" = false ] || [ "$dmarc_valid" = false ]; then
        generate_update_commands
    fi
    
    test_authentication
    
    echo -e "\n${GREEN}Script completed!${NC}"
    echo "Remember: DNS changes can take up to 48 hours to propagate globally."
}

# Run main function
main