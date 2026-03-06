import * as React from 'react';
import { Card, CardHeader, CardContent } from '../card';
import { StyledLabel } from './styled-label';
import { FeatureList } from './feature-list';
import { FeatureItem } from './feature-item';
import { InfoNote } from './info-note';

export type FeaturesCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Card header title */
  title?: string;
  /** Hex code for header */
  code?: string;
  /** List of feature strings */
  features: string[];
  /** Optional note text at bottom */
  note?: string;
  /** Feature icon type */
  featureIcon?: 'arrow' | 'check' | 'dot';
};

const FeaturesCard = React.forwardRef<HTMLDivElement, FeaturesCardProps>(
  ({ title = 'TEMPLATE FEATURES', features, note, featureIcon = 'arrow', className, ...props }, ref) => (
    <Card ref={ref} className={className} {...props}>
      <CardHeader title={title} />
      <CardContent>
        <StyledLabel className="mb-4">{title}</StyledLabel>
        <FeatureList>
          {features.map((feature, index) => (
            <FeatureItem key={index} icon={featureIcon}>
              {feature}
            </FeatureItem>
          ))}
        </FeatureList>
        {note && <InfoNote>{note}</InfoNote>}
      </CardContent>
    </Card>
  )
);
FeaturesCard.displayName = 'FeaturesCard';

export { FeaturesCard };
