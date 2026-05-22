import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  Badge,
  Avatar,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Switch,
  FormControlLabel,
  Slider,
  Rating,
  LinearProgress
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  LocalOffer as OfferIcon,
  People as PeopleIcon,
  ShoppingCart as CartIcon,
  TrendingUp as TrendingIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Analytics as AnalyticsIcon,
  Campaign as CampaignIcon,
  Discount as DiscountIcon,
  Star as StarIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

// Mock data for products (in real app, this would come from your product management system)
const mockProducts = [
  {
    id: 1,
    name: 'Premium Wireless Headphones',
    category: 'Electronics',
    price: 199.99,
    stock: 45,
    rating: 4.8,
    image: 'https://via.placeholder.com/60x60/2196F3/FFFFFF?text=H',
    tags: ['Wireless', 'Premium', 'Audio']
  },
  {
    id: 2,
    name: 'Smart Fitness Watch',
    category: 'Wearables',
    price: 299.99,
    stock: 32,
    rating: 4.6,
    image: 'https://via.placeholder.com/60x60/4CAF50/FFFFFF?text=W',
    tags: ['Fitness', 'Smart', 'Health']
  },
  {
    id: 3,
    name: 'Organic Coffee Beans',
    category: 'Food & Beverage',
    price: 24.99,
    stock: 120,
    rating: 4.9,
    image: 'https://via.placeholder.com/60x60/8D6E63/FFFFFF?text=C',
    tags: ['Organic', 'Premium', 'Coffee']
  },
  {
    id: 4,
    name: 'Designer T-Shirt',
    category: 'Fashion',
    price: 49.99,
    stock: 78,
    rating: 4.4,
    image: 'https://via.placeholder.com/60x60/FF5722/FFFFFF?text=T',
    tags: ['Designer', 'Cotton', 'Fashion']
  },
  {
    id: 5,
    name: 'Home Security Camera',
    category: 'Smart Home',
    price: 89.99,
    stock: 56,
    rating: 4.7,
    image: 'https://via.placeholder.com/60x60/607D8B/FFFFFF?text=C',
    tags: ['Security', 'Smart', 'Home']
  }
]

// Mock data for existing promotions
const mockPromotions = [
  {
    id: 1,
    name: 'Summer Sale 2024',
    type: 'Percentage Discount',
    value: 25,
    products: [1, 2, 4],
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    status: 'Active',
    customers: 1250,
    revenue: 15420.50,
    targetAudience: 'All Customers'
  },
  {
    id: 2,
    name: 'New Customer Welcome',
    type: 'Fixed Amount',
    value: 50,
    products: [1, 3, 5],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'Active',
    customers: 890,
    revenue: 8920.75,
    targetAudience: 'New Customers'
  },
  {
    id: 3,
    name: 'Premium Member Exclusive',
    type: 'Percentage Discount',
    value: 15,
    products: [2, 4, 5],
    startDate: '2024-05-01',
    endDate: '2024-07-31',
    status: 'Scheduled',
    customers: 450,
    revenue: 6780.25,
    targetAudience: 'Premium Members'
  }
]

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [promotions, setPromotions] = useState(mockPromotions)
  const [products, setProducts] = useState(mockProducts)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [priceRange, setPriceRange] = useState([0, 500])
  const [showCreatePromotion, setShowCreatePromotion] = useState(false)
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [newPromotion, setNewPromotion] = useState({
    name: '',
    type: 'Percentage Discount',
    value: 0,
    startDate: '',
    endDate: '',
    targetAudience: 'All Customers',
    description: ''
  })

  // Safe search function that won't cause hanging
  const handleSearch = useCallback((term) => {
    if (!term || term.trim() === '') {
      setProducts(mockProducts)
      return
    }
    
    const filtered = mockProducts.filter(product => 
      product.name.toLowerCase().includes(term.toLowerCase()) ||
      product.category.toLowerCase().includes(term.toLowerCase()) ||
      product.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
    )
    setProducts(filtered)
  }, [])

  // Debounced search to prevent excessive filtering
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchTerm)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm, handleSearch])

  const handleCreatePromotion = () => {
    if (!newPromotion.name || !newPromotion.value || !newPromotion.startDate || !newPromotion.endDate) {
      toast.error('Please fill in all required fields')
      return
    }

    const promotion = {
      id: Date.now(),
      ...newPromotion,
      products: selectedProducts,
      status: 'Draft',
      customers: 0,
      revenue: 0,
      createdAt: new Date().toISOString()
    }

    setPromotions([...promotions, promotion])
    setShowCreatePromotion(false)
    setSelectedProducts([])
    setNewPromotion({
      name: '',
      type: 'Percentage Discount',
      value: 0,
      startDate: '',
      endDate: '',
      targetAudience: 'All Customers',
      description: ''
    })
    toast.success('Promotion created successfully!')
  }

  const handleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const getProductById = (id) => mockProducts.find(p => p.id === id)

  const calculatePromotionValue = (promotion, productPrice) => {
    if (promotion.type === 'Percentage Discount') {
      return (productPrice * promotion.value / 100).toFixed(2)
    }
    return promotion.value
  }

  const renderPromotionsOverview = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              {promotions.length}
            </Typography>
            <Typography variant="body2">
              Active Promotions
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              {promotions.filter(p => p.status === 'Active').length}
            </Typography>
            <Typography variant="body2">
              Currently Running
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              {promotions.reduce((sum, p) => sum + p.customers, 0)}
            </Typography>
            <Typography variant="body2">
              Total Customers Reached
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              ${promotions.reduce((sum, p) => sum + p.revenue, 0).toLocaleString()}
            </Typography>
            <Typography variant="body2">
              Total Revenue Generated
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  const renderPromotionsList = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Current Promotions</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreatePromotion(true)}
          >
            Create Promotion
          </Button>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Promotion Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Products</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Performance</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {promotions.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {promotion.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {promotion.targetAudience}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${promotion.value}${promotion.type === 'Percentage Discount' ? '%' : '$'}`}
                      color="primary"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {promotion.products.slice(0, 3).map(productId => {
                        const product = getProductById(productId)
                        return product ? (
                          <Tooltip key={productId} title={product.name}>
                            <Avatar
                              src={product.image}
                              sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                            >
                              {product.name.charAt(0)}
                            </Avatar>
                          </Tooltip>
                        ) : null
                      })}
                      {promotion.products.length > 3 && (
                        <Chip label={`+${promotion.products.length - 3}`} size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={promotion.status}
                      color={promotion.status === 'Active' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {promotion.customers.toLocaleString()} customers
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ${promotion.revenue.toLocaleString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" color="primary">
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" color="secondary">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )

  const renderProductSelector = () => (
    <Dialog
      open={showProductSelector}
      onClose={() => setShowProductSelector(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Select Products for Promotion
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Choose which products this promotion will apply to
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Category"
              >
                <MenuItem value="All">All Categories</MenuItem>
                {Array.from(new Set(mockProducts.map(p => p.category))).map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="body2" gutterBottom>
                Price Range: ${priceRange[0]} - ${priceRange[1]}
              </Typography>
              <Slider
                value={priceRange}
                onChange={(e, newValue) => setPriceRange(newValue)}
                min={0}
                max={500}
                valueLabelDisplay="auto"
              />
            </Box>
          </Box>
        </Box>
        
        <Grid container spacing={2}>
          {products.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: selectedProducts.includes(product.id) ? 2 : 1,
                  borderColor: selectedProducts.includes(product.id) ? 'primary.main' : 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 2
                  }
                }}
                onClick={() => handleProductSelection(product.id)}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar src={product.image} sx={{ mr: 1, width: 40, height: 40 }}>
                      {product.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.category}
                      </Typography>
                    </Box>
                    <Switch
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleProductSelection(product.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" color="primary">
                      ${product.price}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Rating value={product.rating} size="small" readOnly />
                      <Typography variant="caption" sx={{ ml: 0.5 }}>
                        ({product.rating})
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                    {product.tags.slice(0, 2).map((tag, index) => (
                      <Chip key={index} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setShowProductSelector(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => setShowProductSelector(false)}
          disabled={selectedProducts.length === 0}
        >
          Select {selectedProducts.length} Products
        </Button>
      </DialogActions>
    </Dialog>
  )

  const renderCreatePromotion = () => (
    <Dialog
      open={showCreatePromotion}
      onClose={() => setShowCreatePromotion(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Create New Promotion
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Design a compelling promotion to boost sales and engage customers
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Promotion Name"
              value={newPromotion.name}
              onChange={(e) => setNewPromotion({ ...newPromotion, name: e.target.value })}
              placeholder="e.g., Summer Sale 2024"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Promotion Type</InputLabel>
              <Select
                value={newPromotion.type}
                onChange={(e) => setNewPromotion({ ...newPromotion, type: e.target.value })}
                label="Promotion Type"
              >
                <MenuItem value="Percentage Discount">Percentage Discount</MenuItem>
                <MenuItem value="Fixed Amount">Fixed Amount Off</MenuItem>
                <MenuItem value="Buy One Get One">Buy One Get One</MenuItem>
                <MenuItem value="Free Shipping">Free Shipping</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={newPromotion.type === 'Percentage Discount' ? 'Discount Percentage' : 'Discount Amount'}
              type="number"
              value={newPromotion.value}
              onChange={(e) => setNewPromotion({ ...newPromotion, value: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: newPromotion.type === 'Percentage Discount' ? null : <InputAdornment position="start">$</InputAdornment>,
                endAdornment: newPromotion.type === 'Percentage Discount' ? <InputAdornment position="end">%</InputAdornment> : null,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Target Audience</InputLabel>
              <Select
                value={newPromotion.targetAudience}
                onChange={(e) => setNewPromotion({ ...newPromotion, targetAudience: e.target.value })}
                label="Target Audience"
              >
                <MenuItem value="All Customers">All Customers</MenuItem>
                <MenuItem value="New Customers">New Customers</MenuItem>
                <MenuItem value="Premium Members">Premium Members</MenuItem>
                <MenuItem value="Returning Customers">Returning Customers</MenuItem>
                <MenuItem value="High-Value Customers">High-Value Customers</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={newPromotion.startDate}
              onChange={(e) => setNewPromotion({ ...newPromotion, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={newPromotion.endDate}
              onChange={(e) => setNewPromotion({ ...newPromotion, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newPromotion.description}
              onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
              placeholder="Describe your promotion to customers..."
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">Selected Products</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowProductSelector(true)}
              >
                {selectedProducts.length > 0 ? `Edit (${selectedProducts.length})` : 'Select Products'}
              </Button>
            </Box>
            
            {selectedProducts.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedProducts.map(productId => {
                  const product = getProductById(productId)
                  return product ? (
                    <Chip
                      key={productId}
                      label={product.name}
                      onDelete={() => handleProductSelection(productId)}
                      color="primary"
                      variant="outlined"
                    />
                  ) : null
                })}
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setShowCreatePromotion(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreatePromotion}
          disabled={!newPromotion.name || !newPromotion.value || !newPromotion.startDate || !newPromotion.endDate || selectedProducts.length === 0}
        >
          Create Promotion
        </Button>
      </DialogActions>
    </Dialog>
  )

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Customer Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage customer relationships, create promotions, and track engagement
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Overview" icon={<AnalyticsIcon />} />
        <Tab label="Promotions" icon={<CampaignIcon />} />
        <Tab label="Customer Analytics" icon={<PeopleIcon />} />
        <Tab label="Campaigns" icon={<NotificationsIcon />} />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {renderPromotionsOverview()}
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Quick Actions
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => setShowCreatePromotion(true)}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <CampaignIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Create Promotion
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Design and launch new promotional campaigns
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', cursor: 'pointer' }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <PeopleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Customer Segments
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create targeted customer groups for campaigns
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', cursor: 'pointer' }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <TrendingIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Performance Reports
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Analyze campaign performance and ROI
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {renderPromotionsList()}
        </Box>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Customer Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Advanced customer analytics and insights coming soon...
            </Typography>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Campaign Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Multi-channel campaign orchestration coming soon...
            </Typography>
          </CardContent>
        </Card>
      )}

      {renderProductSelector()}
      {renderCreatePromotion()}
    </Box>
  )
}

export default CustomerDashboard
