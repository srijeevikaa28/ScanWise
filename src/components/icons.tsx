import { QrCode, type SVGProps } from 'lucide-react';

export const Icons = {
  logo: (props: SVGProps<SVGSVGElement>) => (
    <QrCode {...props} />
  ),
};
