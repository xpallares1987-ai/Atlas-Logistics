import type { Meta, StoryObj } from '@storybook/react';
import ComingSoon from '../components/ComingSoon';

const meta = {
  title: 'Components/ComingSoon',
  component: ComingSoon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ComingSoon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    module: 'New Feature',
    description: 'This feature is coming soon!',
  },
};
